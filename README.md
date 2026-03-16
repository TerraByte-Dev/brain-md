# Brain.md

**Persistent memory for AI agents. Open spec. Local first. Human readable.**

Brain.md is an open standard and toolset that gives AI agents persistent, structured memory. Every memory is a plain markdown file on your disk — inspectable, editable, version-controllable, and portable across any AI agent.

## The Problem

AI agents have amnesia. Every session starts from scratch. You explain your preferences, your project context, your coding standards — and next session, it's all gone. Developers are duct-taping memory together with scattered markdown files and custom system prompts. There's no standard, no tooling, and no way to see what your agent actually knows.

## The Solution

A Brain is just a folder with structured markdown files and a lightweight index. Any AI agent can read and write to it. You can open any memory in VS Code, Obsidian, or a plain text editor. It works offline. You own your data.

```
my-brain/
├── .brain/
│   ├── config.json        # Brain configuration
│   └── index.json         # Thought index for fast queries
├── BRAIN.md               # Entry point — what this Brain is for
└── thoughts/
    ├── user/              # Who you are
    ├── context/           # What's being worked on now
    ├── decisions/         # Your preferences and choices
    ├── learnings/         # Corrections and patterns
    ├── references/        # External resources
    └── projects/          # Project knowledge
```

## Quick Start

### With Claude Code

1. Copy the skill file into your Claude Code configuration:

```bash
cp skills/brain.md ~/.claude/skills/brain.md
```

2. Tell Claude Code to initialize a Brain:

```
> Initialize a Brain in this project
```

3. That's it. Your agent will now remember things across sessions — preferences, corrections, decisions, project context — all stored as readable markdown files.

### Manual Setup

1. Clone this repo:
```bash
git clone https://github.com/TerraByte-Dev/brain-md.git
```

2. Look at the [example Brain](examples/sample-brain/) to see the structure in action.

3. Read the [full spec](SPEC.md) to understand the format.

4. Create a `.brain/` directory in your project or home folder and start writing thoughts.

## What a Thought Looks Like

Every memory ("thought") is a markdown file with standardized frontmatter:

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

## Key Features

- **Agent-agnostic** — Works with Claude Code, Cursor, Copilot, OpenClaw, or any agent
- **Local-first** — Plain files on your disk. No cloud required. No vendor lock-in.
- **Human-readable** — Every memory is a markdown file you can open in any editor
- **Git-friendly** — Version control your Brain. Diff, blame, merge memories.
- **Confidence scoring** — Agents mark how sure they are about each memory
- **TTL (time-to-live)** — Memories can expire so your Brain doesn't accumulate stale knowledge
- **Linkable** — Thoughts can reference other thoughts, forming a knowledge graph

## Documentation

- [**SPEC.md**](SPEC.md) — The full Brain.md specification (v0.1.0)
- [**skills/brain.md**](skills/brain.md) — Claude Code skill for using Brain.md
- [**examples/sample-brain/**](examples/sample-brain/) — A complete example Brain

## Roadmap

- [x] Brain Spec v0.1
- [x] Claude Code skill
- [x] Example Brain
- [ ] MCP server (use Brain.md with any MCP-compatible agent)
- [ ] Desktop app with Neural View (3D visualization of your agent's memory)
- [ ] Brain Sync (encrypted cross-device sync)
- [ ] Brain Cloud (hosted brains for teams)

## Contributing

Brain.md is in early development. If you're using it, I want to hear from you:
- Open an [issue](https://github.com/TerraByte-Dev/brain-md/issues) with feedback, bugs, or feature requests
- Star the repo if you find it useful

## License

MIT — see [LICENSE](LICENSE)
