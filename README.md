# Brain.md

**Give your AI a brain it never loses. Watch it think.**

Brain.md is a persistent knowledge engine for AI agents. Not a note-taking app. Not a RAG pipeline. A **Brain** — a living, growing memory system that your AI builds automatically as you work together. You are the curator. The AI is the author.

Think Tony Stark and JARVIS. JARVIS doesn't wait to be told what to remember. It learns constantly — patterns, preferences, decisions, connections across projects. Brain.md gives any AI agent that capability.

---

## The Metaphor

Brain.md has three layers:

- **The Brain** — A folder on disk. Thousands of thoughts stored as markdown files with structured YAML frontmatter. Every pattern recognized, every decision made, every debugging insight, every cross-project connection. This is the AI's actual knowledge — local-first, human-readable, git-friendly.

- **The Skull** — The desktop app (Tauri + Svelte). A visual interface for the human to browse, search, curate, and observe the Brain. The human's window into what the AI knows. Includes a live 3D Neural View where you watch thoughts form and connections draw in real-time.

- **The Nervous System** — The rules, skills, and protocols that teach the AI HOW to build its brain. When to remember, how to tag, how to connect ideas, when to forget. The intelligence behind the memory. This lives as a skill file that any AI agent can load.

Together: **simulated AGI.** Not real AGI — but an AI that never forgets, draws connections across all your projects, and gets smarter the longer you use it.

---

## The Problem

AI agents have amnesia. You explain your architecture, your preferences, your coding standards — and next session, it's all gone. You're constantly re-explaining yourself. There's no standard for agent memory, no way to see what your AI knows, and no way to search across projects for "everything I've ever done with C#."

Existing solutions are either cloud-dependent (mem0, Zep), opaque (no visibility into what's stored), or designed for humans not AI (Obsidian). Nobody has a local-first memory system with a visual interface that shows the AI thinking in real-time.

## The Solution

Brain.md is four things:

### 1. The Brain Spec
An open standard for how AI agents structure persistent memory. Thought types (user, context, decision, learning, reference, project), confidence scoring (0.0–1.0), TTL-based expiry, cross-project tagging, hierarchical project scoping. Any agent framework can implement it.

### 2. The MCP Server
A TypeScript server that any AI agent connects to via MCP (Model Context Protocol). Seven tools, one call each. The server handles all file I/O, UUID generation, index management, full-text search (FTS5), and event logging. Zero LLM tokens wasted on mechanical work.

**Phase 2 backend (current):** SQLite with FTS5 full-text search, event logging for live visualization, WebSocket server for the Skull. Markdown files still written as human-readable projections.

### 3. The Skill File
A markdown instruction file that teaches any AI agent HOW to use the Brain. The core rule: **after every substantive response, save 0-3 atomic thoughts.** This is not optional. This is how the Brain builds itself. The human never has to say "remember this" — the AI journals its own experience automatically.

### 4. The Skull (Desktop App)
A Tauri v2 + Svelte 5 desktop application. Dark JARVIS-aesthetic theme. Brain picker (like Obsidian vaults), explorer sidebar, thought viewer with metadata UI, FTS5 search, curation actions (confirm, edit, forget). Phase 2c will add the live 3D Neural View — the "holy shit" feature that makes people screenshot and share.

---

## Who Is This For?

**Primary:** AI-native developers who use Claude Code, Cursor, Copilot, or similar agent tools daily. Solo devs and small teams who want their AI to actually know them.

**Secondary:** Agent framework builders who want a standard for persistent memory in their platforms.

**Later:** Non-developer power users who work with AI assistants and want a smarter, more personalized experience.

---

## Quick Start

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
Initialize a Brain called "My Dev Brain" with description "Personal development brain"
```

### 4. That's it.

Your agent now builds a Brain automatically — preferences, corrections, decisions, project context, patterns. Everything stored as readable markdown files. Start a new session and your agent already knows who you are.

---

## How It Works

### The Self-Building Brain

The skill file (the nervous system) instructs the AI to save thoughts automatically after every meaningful exchange. No explicit "remember this" needed. The AI asks itself: *"What did I just learn that I'd want to know next session?"* and saves it.

- **Confidence 1.0** — Human explicitly stated this (ground truth)
- **Confidence 0.7** — AI inferred this (strong evidence)
- Multiple thoughts on the same topic is fine — the Brain accumulates, the human curates

### Thought Types

| Type | Purpose | Example |
|------|---------|---------|
| `user` | About the human — identity, preferences, expertise | "Prefers Svelte, uses React at work" |
| `context` | Current working state, session info | "Debugging the auth middleware" |
| `decision` | A choice that guides future behavior | "Local-first architecture for all products" |
| `learning` | A correction, feedback, or discovered pattern | "Don't mock databases in integration tests" |
| `reference` | Pointer to external resource | "API docs at docs.example.com" |
| `project` | Knowledge about ongoing work | "Brain.md Phase 2 — building the Skull" |

### What a Thought Looks Like

Every thought is a plain markdown file:

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

---

## MCP Tools

| Tool | Purpose |
|------|---------|
| `brain_init` | Create a new Brain |
| `brain_remember` | Save a thought (type, title, content, tags, confidence, TTL) |
| `brain_recall` | Query thoughts (filter by type, project, tags, keyword, confidence) — uses FTS5 |
| `brain_update` | Modify an existing thought |
| `brain_forget` | Remove a thought and clean up links |
| `brain_reflect` | Self-review for expired, low-confidence, or orphaned thoughts |
| `brain_status` | Quick overview: name, thought count, recent activity |

The MCP interface is stable across all phases. The backend can upgrade from JSON to SQLite to vector embeddings — the agent never notices.

---

## The Brain Structure

```
my-brain/
├── .brain/
│   ├── config.json        # Brain configuration
│   ├── brain.db           # SQLite database (source of truth)
│   └── index.json.bak     # Legacy JSON index (pre-migration backup)
├── BRAIN.md               # Entry point — what this Brain is for
├── thoughts/              # Global knowledge (markdown projections)
│   ├── user/              # Who you are, your preferences
│   ├── context/           # What you're working on now
│   ├── decisions/         # Cross-project decisions
│   ├── learnings/         # Corrections and patterns
│   └── references/        # External resources
└── projects/              # Project-scoped knowledge
    ├── Game Development/
    │   └── My RPG/
    │       ├── combat-system.md
    │       └── photon-networking.md
    └── Brain.md/
        └── mcp-server-design.md
```

The Brain is root. Everything lives inside it. Projects are folders within the Brain. Type folders (user, learnings, decisions) are siblings to Projects. Cross-project queries work via tags.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  THE SKULL (Tauri + Svelte Desktop App)     │
│  Brain picker · Explorer · Viewer · Search  │
│  Neural View (3D — Phase 2c)               │
└──────────────────┬──────────────────────────┘
                   │ IPC / WebSocket (port 6677)
┌──────────────────┴──────────────────────────┐
│  BRAIN MCP SERVER (TypeScript + Node.js)    │
│  7 MCP tools · SQLite + FTS5 · Event bus   │
│  Markdown projections · WebSocket broadcast │
└──────────────────┬──────────────────────────┘
                   │ Read / Write
┌──────────────────┴──────────────────────────┐
│  THE BRAIN (Folder on Disk)                 │
│  .brain/brain.db · thoughts/ · projects/    │
│  Human-readable · Git-friendly · Local-first│
└─────────────────────────────────────────────┘
```

---

## Key Features

- **Self-building** — The AI saves thoughts automatically. No "remember this" required.
- **Agent-agnostic** — Works with Claude Code, Cursor, Copilot, or any MCP-compatible agent
- **Local-first** — Plain files on your disk. No cloud. No API keys. No vendor lock-in.
- **Human-readable** — Every thought is a markdown file you can open in any editor
- **Git-friendly** — Version control your Brain. Diff, blame, and merge memories.
- **Full-text search** — SQLite FTS5 powers fast keyword search across all thoughts
- **Confidence scoring** — Agents mark certainty (0.0–1.0). Human-stated = 1.0, inferred = 0.7.
- **TTL expiry** — Thoughts expire (session, 7d, 30d, 90d, permanent) so the Brain stays fresh
- **Cross-project** — One Brain, all your projects. Tag-based queries span everything.
- **Event bus** — Every operation emits events. WebSocket broadcasts to the Skull for live updates.
- **Brain picker** — Open any Brain folder, like Obsidian vaults. Switch between Brains freely.

---

## Roadmap

### Phase 1: The Foundation ✅
- [x] Brain Spec v0.1
- [x] MCP Server (7 tools)
- [x] Claude Code skill file (v0.2.0 — self-building protocol)
- [x] Full lifecycle tested (9 checks passed)

### Phase 2: The Skull ← Current
- [x] SQLite backend (better-sqlite3 + FTS5)
- [x] Event bus + WebSocket server (port 6677)
- [x] JSON → SQLite migration tool
- [x] Tauri v2 + Svelte 5 desktop app
- [x] Brain picker (vault-style selection)
- [x] Explorer sidebar (Brain as root)
- [x] Thought viewer with metadata UI
- [x] FTS5 search
- [ ] ONNX embeddings for semantic search
- [ ] 3D Neural View (Three.js via Threlte)
- [ ] Live events: nodes pulse on recall, materialize on creation

### Phase 3: Monetization
- [ ] Brain Sync — encrypted cross-device sync
- [ ] Brain Cloud — hosted brains for teams
- [ ] Version history — watch thoughts evolve

### Phase 4: Ecosystem
- [ ] Brain Templates marketplace
- [ ] Plugin system for the Skull
- [ ] Community skills for other agent platforms
- [ ] Advanced Neural View: heatmaps, attention trails, knowledge gap analysis

---

## Why Brain.md Over Alternatives?

| | Brain.md | mem0/Zep | Claude Code auto-memory | Obsidian |
|---|---|---|---|---|
| **Who writes** | AI (automatic) | AI (API) | AI (automatic) | Human |
| **Storage** | Local files + SQLite | Cloud | Local files | Local files |
| **Visibility** | Full (Skull app) | Opaque | Minimal | Full |
| **Agent-agnostic** | Yes (MCP) | SDK-specific | Claude only | Not for AI |
| **Cross-project** | Yes (tags) | Per-session | Per-project | Manual |
| **Visualization** | 3D Neural View | None | None | Graph view |
| **Cost** | Free | $$$$/mo | Free | Free |
| **The moat** | Neural View + local-first + self-building | Cloud lock-in | Tied to Claude | Human-authored |

---

## Documentation

- [**SPEC.md**](SPEC.md) — The full Brain.md specification
- [**skills/brain.md**](skills/brain.md) — Claude Code skill (v0.2.0 — self-building protocol)
- [**examples/sample-brain/**](examples/sample-brain/) — A complete example Brain

## Contributing

Brain.md is in active development. If you're using it, I want to hear from you:

- Open an [issue](https://github.com/TerraByte-Dev/brain-md/issues) with feedback, bugs, or feature requests
- Star the repo if you find it useful

## License

MIT — see [LICENSE](LICENSE)
