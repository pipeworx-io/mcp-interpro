# mcp-interpro

InterPro MCP (EBI) — protein family / domain / functional-site classification.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_entries` | Search InterPro for protein families, domains, repeats and functional sites by keyword (text search over entry names/accessions). InterPro is EBI's integrated protein-signature classification (Pfam, PROSITE, SMART, CDD, PANTHER, ...). Returns matching entries with accession (IPRxxxxxx), name, type (family\|domain\|repeat\|site\|...), and the member databases the signature is built from. Keyless. |
| `get_entry` | Get full details for a single InterPro entry by accession (e.g. "IPR000001"). Returns the entry name, type, a plain-text description, member-signature/protein counters, and associated GO terms (molecular function / biological process / cellular component). Use after search_entries or entries_for_protein to learn what a family/domain actually is. Keyless. |
| `entries_for_protein` | List all InterPro entries (families, domains, sites) found on a given UniProt protein, by UniProt accession (e.g. "P12345"). Returns each matching InterPro signature with accession, name and type. Useful to functionally annotate a protein. Complements UniProt/AlphaFold. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "interpro": {
      "url": "https://gateway.pipeworx.io/interpro/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/interpro/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Interpro data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
