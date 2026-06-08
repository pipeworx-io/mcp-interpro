interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * InterPro MCP (EBI) — protein family / domain / functional-site classification.
 *
 * Wraps the keyless InterPro REST API at https://www.ebi.ac.uk/interpro/api.
 * InterPro integrates protein signatures from member databases (Pfam, PROSITE,
 * SMART, CDD, PANTHER, ...) into families, domains, repeats and sites.
 * Complements UniProt / AlphaFold. No API key required.
 */


const BASE = 'https://www.ebi.ac.uk/interpro/api';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_entries',
    description:
      'Search InterPro for protein families, domains, repeats and functional sites by keyword (text search over entry names/accessions). InterPro is EBI\'s integrated protein-signature classification (Pfam, PROSITE, SMART, CDD, PANTHER, ...). Returns matching entries with accession (IPRxxxxxx), name, type (family|domain|repeat|site|...), and the member databases the signature is built from. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword to search, e.g. "kinase", "kringle", "zinc finger".' },
        limit: { type: 'number', description: 'Max entries to return (default 20, max 100).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_entry',
    description:
      'Get full details for a single InterPro entry by accession (e.g. "IPR000001"). Returns the entry name, type, a plain-text description, member-signature/protein counters, and associated GO terms (molecular function / biological process / cellular component). Use after search_entries or entries_for_protein to learn what a family/domain actually is. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        accession: { type: 'string', description: 'InterPro accession, e.g. "IPR000001".' },
      },
      required: ['accession'],
    },
  },
  {
    name: 'entries_for_protein',
    description:
      'List all InterPro entries (families, domains, sites) found on a given UniProt protein, by UniProt accession (e.g. "P12345"). Returns each matching InterPro signature with accession, name and type. Useful to functionally annotate a protein. Complements UniProt/AlphaFold. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        uniprot: { type: 'string', description: 'UniProt accession, e.g. "P12345".' },
      },
      required: ['uniprot'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_entries':
        return await searchEntries(args);
      case 'get_entry':
        return await getEntry(args);
      case 'entries_for_protein':
        return await entriesForProtein(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: `InterPro: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// --- tool impls ---

async function searchEntries(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query');
  let limit = typeof args.limit === 'number' ? Math.floor(args.limit) : 20;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const url = `${BASE}/entry/interpro/?search=${encodeURIComponent(query)}&page_size=${limit}`;
  const data = await ipGet(url);
  if ((data as { error?: string }).error) return data;

  const d = data as { count?: number; results?: Array<{ metadata?: Record<string, unknown> }> };
  const results = (d.results ?? []).map((r) => {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    const memberDbs = m.member_databases && typeof m.member_databases === 'object'
      ? Object.keys(m.member_databases as Record<string, unknown>)
      : [];
    return {
      accession: m.accession ?? null,
      name: m.name ?? null,
      type: m.type ?? null,
      source_database: m.source_database ?? null,
      member_databases: memberDbs,
    };
  });
  return { count: d.count ?? results.length, results };
}

async function getEntry(args: Record<string, unknown>): Promise<unknown> {
  const accession = reqStr(args, 'accession');
  const url = `${BASE}/entry/interpro/${encodeURIComponent(accession)}`;
  const data = await ipGet(url);
  if ((data as { error?: string }).error) {
    const err = (data as { error: string; status?: number }).error;
    if ((data as { status?: number }).status === 404 || /404|not found/i.test(err)) {
      return { error: 'entry not found', accession };
    }
    return data;
  }

  const m = ((data as { metadata?: Record<string, unknown> }).metadata ?? {}) as Record<string, unknown>;
  const descArr = Array.isArray(m.description) ? (m.description as Array<{ text?: string }>) : [];
  const description = stripHtml(descArr.map((x) => x?.text ?? '').filter(Boolean).join(' ')).trim();

  return {
    accession: extractName(m.accession) ?? accession,
    name: extractName(m.name),
    type: m.type ?? null,
    description,
    counters: m.counters ?? null,
    go_terms: m.go_terms ?? null,
  };
}

async function entriesForProtein(args: Record<string, unknown>): Promise<unknown> {
  const uniprot = reqStr(args, 'uniprot');
  const url = `${BASE}/entry/interpro/protein/uniprot/${encodeURIComponent(uniprot)}`;
  const data = await ipGet(url);
  if ((data as { error?: string }).error) {
    const err = (data as { error: string; status?: number }).error;
    if ((data as { status?: number }).status === 404 || /404|not found/i.test(err)) {
      return { uniprot, count: 0, entries: [] };
    }
    return data;
  }

  const d = data as { count?: number; results?: Array<{ metadata?: Record<string, unknown> }> };
  const entries = (d.results ?? []).map((r) => {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    return { accession: m.accession ?? null, name: m.name ?? null, type: m.type ?? null };
  });
  return { uniprot, count: d.count ?? entries.length, entries };
}

// --- helpers ---

async function ipGet(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  } catch (e) {
    return { error: `InterPro: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!res.ok) {
    return { error: `InterPro: ${res.status}`, status: res.status };
  }
  try {
    return await res.json();
  } catch (e) {
    return { error: `InterPro: parse error ${e instanceof Error ? e.message : String(e)}` };
  }
}

// InterPro returns `name` either as a string or as { name, short } depending on endpoint.
function extractName(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof (v as { name?: unknown }).name === 'string') {
    return (v as { name: string }).name;
  }
  return null;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing or empty.`);
  }
  return v.trim();
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
