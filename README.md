# Brain.md

**Give your AI a brain it never loses. Watch it think.**

Brain.md is a personal knowledge engine for developers. Your AI agent builds a persistent brain — thousands of thoughts, every pattern recognized, every decision made, every debugging insight, every cross-project connection. You watch it think through a JARVIS-style display.

## The Problem

AI agents have amnesia. You explain your architecture, your preferences, your coding standards — and next session, it's all gone. You're constantly re-explaining yourself. There's no standard for agent memory, no way to see what your AI knows, and no way to search across projects for "everything I've ever done with C#."

## The Solution

Brain.md is three things:

1. **The Brain Spec** — An open standard for how AI agents structure persistent memory. Any agent framework can implement it.

2. **The MCP Server** — A lightweight server any AI agent connects to via MCP. One tool call per operation. The server handles all file I/O, UUID generation, and index management.

3. **The Skull** *(coming in Phase 2)* — A desktop application with a live 3D Neural View. Watch your AI's knowledge network in real-time. Nodes pulse when memories are accessed. New thoughts materialize. Cross-project connections draw themselves. **This is the thing people screenshot and share.**

Together: simulated AGI. Not real AGI — but an AI that never forgets, draws connections across all your projects, and gets smarter the longer you use it.

## Quick Start (MCP Server)

The MCP server is the recommended way to use Brain.md. It's faster, more reliable, and works with any MCP-compatible agent.

### 1. Clone and build

```bash
git clone https://github.com/TerraByte-Dev/brain-md.git
cd brain-md/server
npm install
npm run build
```

### 2. Add to your Claude Code config (`~/.claude.json`)

```json
{
  "projects": {
    "/path/to/your/project": {
      "mcpServers": {
        "brain-md": {
          "command": "node",
          "args": ["/path/to/brain-md/server/dist/index.js"],
          "env": {
            "BRAIN_PATH": "/path/to/your/brain"
          }
        }
      }
    }
  }
}
```

### 3. Initialize your Brain

Start a new Claude Code session and say:

```
Initialize a Brain called "My Dev Brain" with description "My personal development brain"
```

### 4. That's it.

Your agent now remembers things across sessions — preferences, corrections, decisions, project context — all stored as readable markdown files in your Brain folder. Start a new session and your agent already knows who you are.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `brain_init` | Create a new Brain |
| `brain_remember` | Save a thought (type, title, content, tags, confidence, TTL) |
| `brain_recall` | Query thoughts (filter by type, project, tags, keyword, confidence) |
| `brain_update` | Modify an existing thought |
| `brain_forget` | Remove a thought |
| `brain_reflect` | Self-review for expired, low-confidence, or orphaned thoughts |
| `brain_status` | Quick overview: name, thought count, recent activity |

## What a Thought Looks Like

Every memory ("thought") is a plain markdown file:

```yaml
---
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
type: learning
title: "No Mocks In Integration Tests"
created: "2026-03-16T11:00:00Z"
modified: "2026-03-16T14:22:00Z"
source: human
confidence: 1.0
ttl: permanent
tags: [testing, backend]
links: []
---

# No Mocks In Integration Tests

Integration tests must hit a real database, not mocks.

**Why:** Mocked tests passed but prod migration failed — mock didn't reflect a schema change.

**How to apply:** Always use a real database connection for integration tests.
```

Open it in VS Code, Obsidian, or any text editor. Version control it with git. It's just files.

## The Brain Structure

A single Brain for your entire development life — organized hierarchically by project:

```
my-brain/
├── .brain/
│   ├── config.json        # Brain configuration
│   └── index.json         # Thought index for fast queries
├── BRAIN.md               # Entry point — what this Brain is for
├── thoughts/              # Global knowledge
│   ├── user/              # Who you are, your preferences
│   ├── context/           # What you're working on now
│   ├── decisions/         # Cross-project decisions
│   ├── learnings/         # Corrections and patterns
│   └── references/        # External resources
└── projects/              # Project-scoped knowledge
    ├── Game Development/
    │   └── My RPG/
    │       ├── combat-system.md      # [c#, unity, combat]
    │       └── photon-networking.md  # [c#, networking, multiplayer]
    └── Web Development/
        └── Brain.md/
            └── mcp-server-design.md  # [typescript, mcp, architecture]
```

Cross-project queries work because of tags: "Show me everything I've ever done with C#" searches tags across every project.

## Key Features

- **Agent-agnostic** — Works with Claude Code, Cursor, Copilot, OpenClaw, or any MCP-compatible agent
- **Local-first** — Plain files on your disk. No cloud required. No vendor lock-in.
- **Human-readable** — Every thought is a markdown file you can open in any editor
- **Git-friendly** — Version control your Brain. Diff, blame, and merge memories.
- **Confidence scoring** — Agents mark how sure they are about each thought (0.0–1.0)
- **TTL** — Thoughts expire so your Brain stays fresh, not bloated
- **Cross-project** — One Brain, all your projects. Tag-based queries span everything.
- **Hierarchical scoping** — Project paths (`Game Development/My RPG`) for organized retrieval

## Roadmap

- [x] Brain Spec v0.1
- [x] MCP Server (7 tools: init, remember, recall, update, forget, reflect, status)
- [x] Claude Code skill file
- [x] Example Brain with sample thoughts
- [ ] Desktop app — **The Skull** — with live 3D Neural View (Phase 2)
- [ ] SQLite + vector embeddings for semantic search (Phase 2)
- [ ] Brain Sync — encrypted cross-device sync (Phase 3)
- [ ] Brain Cloud — hosted brains for teams (Phase 3)

## Documentation

- [**SPEC.md**](SPEC.md) — The full Brain.md specification (v0.1.0)
- [**skills/brain.md**](skills/brain.md) — Claude Code skill (MCP-first with manual fallback)
- [**examples/sample-brain/**](examples/sample-brain/) — A complete example Brain

## Contributing

Brain.md is in early development. If you're using it, I want to hear from you:

- Open an [issue](https://github.com/TerraByte-Dev/brain-md/issues) with feedback, bugs, or feature requests
- Star the repo if you find it useful

## License

MIT — see [LICENSE](LICENSE)
