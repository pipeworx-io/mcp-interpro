# mcp-interpro

InterPro MCP (EBI) — protein family / domain / functional-site classification.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Interpro data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
