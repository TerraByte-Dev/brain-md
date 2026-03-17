# Brain.md Specification v0.1.0

> Persistent memory for AI agents. Open spec. Local first. Human readable.

## 1. Overview

Brain.md defines an open standard for how AI agents store, retrieve, and manage persistent memory. A "Brain" is a directory on the local filesystem containing structured markdown files ("thoughts") with standardized frontmatter metadata.

The spec is designed to be:
- **Agent-agnostic** — Any AI agent or framework can implement it
- **Local-first** — Your data lives on your machine as plain files
- **Human-readable** — Every memory is a markdown file you can open in any editor
- **Git-friendly** — Brains can be version-controlled, diffed, and merged
- **Extensible** — Custom thought types, properties, and schemas are first-class

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Brain** | A directory containing a `.brain/` folder and structured thought files |
| **Thought** | A single memory, stored as a markdown file with frontmatter |
| **Neural View** | A graph visualization of thoughts and their connections |
| **Confidence** | A 0.0–1.0 score indicating how reliable a thought is |
| **TTL** | Time-to-live — how long a thought remains relevant |
| **BRAIN.md** | The entry point file that describes a Brain's purpose and conventions |

## 3. Directory Structure

A Brain is created by adding a `.brain/` directory to any folder. A Brain is designed to be a **single, comprehensive knowledge base** for a developer — not one Brain per project, but one Brain that contains all projects, organized hierarchically.

```
my-brain/
├── .brain/                        # Brain metadata directory (REQUIRED)
│   ├── config.json                # Brain configuration (REQUIRED)
│   ├── index.json                 # Master thought index (REQUIRED)
│   └── schemas/                   # Custom property schemas (OPTIONAL)
│       └── default.json
│
├── BRAIN.md                       # Brain entry point (REQUIRED)
│
├── thoughts/                      # Global thoughts (REQUIRED)
│   ├── user/                      # Who the human is
│   ├── context/                   # Current working state
│   ├── decisions/                 # Cross-project decisions and preferences
│   ├── learnings/                 # Cross-project learnings
│   └── references/                # Cross-project references
│
└── projects/                      # Project-scoped thoughts (OPTIONAL)
    ├── Game Development/
    │   └── My RPG/
    │       ├── combat-system.md       # [c#, unity, combat, game-mechanics]
    │       ├── photon-networking.md   # [c#, networking, multiplayer]
    │       └── shader-water.md        # [hlsl, shaders, visual-effects]
    ├── Web Development/
    │   ├── Brain.md/
    │   │   ├── mcp-server-design.md   # [typescript, mcp, architecture]
    │   │   └── tauri-app-setup.md     # [rust, svelte, desktop-app]
    │   └── Stream Tools/
    │       └── highlight-detector.md  # [python, audio, whisper, ffmpeg]
    └── DevOps/
        └── azure-iam-lab.md           # [azure, iam, identity, cloud]
```

This structure enables:
- **Project-scoped queries:** "Show me everything about My RPG"
- **Domain queries:** "Show me all Game Development thoughts"
- **Cross-project queries:** "What is everything I've done with C#?" (searches tags across all projects)
- **Global knowledge:** User profile, cross-project decisions, and preferences live in `thoughts/`

### 3.1 Required Elements

A valid Brain MUST contain:
- `.brain/config.json`
- `.brain/index.json`
- `BRAIN.md`
- `thoughts/` directory

### 3.2 Default Thought Directories

Implementations SHOULD create these subdirectories under `thoughts/` on initialization:

| Directory | Purpose | Example |
|-----------|---------|---------|
| `user/` | Information about the human user | Role, preferences, expertise |
| `context/` | Current working state and active focus | What's being worked on now |
| `decisions/` | Choices, preferences, and architectural decisions | "Use TypeScript", "Prefer Tailwind" |
| `learnings/` | Feedback, corrections, and discovered patterns | "Don't mock the database in integration tests" |
| `references/` | Pointers to external resources | URLs, tool locations, documentation |
| `projects/` | Project-specific knowledge and context | Ongoing initiatives, goals, deadlines |

### 3.3 Custom Directories

Users MAY create additional directories under `thoughts/` or at the Brain root. Agents SHOULD respect custom directories and use the `type: custom` field with a `custom_type` property to categorize thoughts stored in them.

## 4. Thought Format

Every thought is a markdown file (`.md`) with YAML frontmatter.

### 4.1 Frontmatter Schema

```yaml
---
id: string              # REQUIRED — UUID v4, unique within the Brain
type: string             # REQUIRED — One of: user, context, decision, learning, reference, project, custom
title: string            # REQUIRED — Human-readable title
created: string          # REQUIRED — ISO 8601 datetime (UTC)
modified: string         # REQUIRED — ISO 8601 datetime (UTC)
source: string           # REQUIRED — One of: agent, human, both
summary: string          # OPTIONAL — One-line description for index and search
confidence: number       # OPTIONAL — 0.0 to 1.0, default 1.0
ttl: string              # OPTIONAL — One of: permanent, session, 7d, 30d, 90d. Default: permanent
project: string          # OPTIONAL — Project path (e.g., "Game Development/My RPG")
tags: string[]           # OPTIONAL — Freeform tags for categorization and cross-project queries
links: string[]          # OPTIONAL — IDs of related thoughts
sensitive: boolean       # OPTIONAL — If true, contains sensitive data. Default: false
custom_type: string      # OPTIONAL — Required when type is "custom"
---
```

### 4.2 Field Definitions

**id** — A UUID v4 string. MUST be unique within the Brain. Generated on thought creation. Never changes.

**type** — The category of thought. MUST be one of the defined types:
- `user` — Information about the human (role, preferences, expertise)
- `context` — Current working state, active focus, session information
- `decision` — A choice or preference that should guide future behavior
- `learning` — A correction, pattern, or feedback the agent received
- `reference` — A pointer to an external resource (URL, file path, service)
- `project` — Knowledge about an ongoing project, initiative, or goal
- `custom` — User-defined type (must also set `custom_type`)

**title** — A short, descriptive title. Used in the index and Neural View.

**summary** — A one-line plain-text description of the thought's content. Used for:
- Index-level search (without reading the full file)
- Neural View hover previews
- Semantic embedding input (Tier 3 retrieval)
- Example: `"Integration tests must use real databases, not mocks"`

**created** — When the thought was first created. ISO 8601 format, UTC timezone.

**modified** — When the thought was last updated. MUST be updated on every write.

**source** — Who created or last modified this thought:
- `agent` — Created or modified by an AI agent
- `human` — Created or modified by a human
- `both` — Collaboratively created (e.g., agent wrote it, human edited it)

**confidence** — How reliable this thought is, from 0.0 to 1.0:
- `1.0` — Explicitly stated by the human. Treat as ground truth.
- `0.7–0.9` — Strong inference by the agent. High reliability.
- `0.4–0.6` — Moderate inference. May need confirmation.
- `0.1–0.3` — Weak signal. Do not rely on without verification.
- `0.0` — Unknown or unverified.

Agents SHOULD prefer higher-confidence thoughts when making decisions.

**ttl** — How long this thought should remain active:
- `permanent` — Never expires. Core knowledge.
- `90d` — Relevant for ~3 months. Project-level context.
- `30d` — Relevant for ~1 month. Recent learnings.
- `7d` — Short-term context. Likely stale after a week.
- `session` — Valid only for the current session. Discard after.

Implementations SHOULD surface expiring thoughts for human review before deletion.

**project** — A path string that scopes this thought to a specific domain and project. Uses forward-slash hierarchy:
- `"Game Development/My RPG"` — A thought belonging to the RPG project under Game Development
- `"Web Development/Brain.md"` — A thought about Brain.md itself
- Omit for global thoughts (user profile, cross-project decisions)
- Enables project-scoped queries ("show me everything about My RPG") and domain queries ("show me all Game Development thoughts")
- Also determines where the thought file is stored on disk when using hierarchical Brain layout

**tags** — An array of freeform strings for categorization. Tags enable cross-project queries and clustering in Neural View. Tags should describe WHAT the thought is about, not WHERE it lives (that's what `project` is for). Examples: `[c#, unity, combat, game-mechanics]`, `[typescript, mcp, architecture]`.

**links** — An array of thought IDs that this thought relates to. Used for graph construction in Neural View and for contextual recall.

**sensitive** — Boolean flag indicating the thought contains sensitive information (credentials, personal data, etc.). Implementations MUST:
- Exclude sensitive thoughts from plain-text exports
- Encrypt sensitive thoughts when syncing
- Optionally blur or hide content in UI by default

**custom_type** — A string label for user-defined thought types. REQUIRED when `type` is `custom`. Allows users to extend the type system without modifying the spec.

### 4.3 Body Format

The markdown body after frontmatter is freeform. However, implementations SHOULD encourage this structure for consistency:

```markdown
# {Title}

{Core content — the actual memory}

**Why:** {The reason or context behind this thought}

**How to apply:** {When and where this thought is relevant}
```

### 4.4 Example Thought

```markdown
---
id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
type: learning
title: "No Mocks In Integration Tests"
created: "2026-03-16T10:30:00Z"
modified: "2026-03-16T14:22:00Z"
source: human
confidence: 1.0
ttl: permanent
tags: [testing, backend, databases]
links: ["f9e8d7c6-b5a4-3210-fedc-ba0987654321"]
---

# No Mocks In Integration Tests

Integration tests must hit a real database, not mocks.

**Why:** Prior incident where mock/prod divergence masked a broken migration. Mocked tests passed, production failed.

**How to apply:** When writing or reviewing integration tests, always use a real database connection. Only use mocks for unit tests of pure logic.
```

## 5. Configuration

### 5.1 config.json

```json
{
  "version": "0.1.0",
  "name": "My Brain",
  "description": "Personal development brain",
  "created": "2026-03-16T10:00:00Z",
  "settings": {
    "default_ttl": "permanent",
    "default_confidence": 1.0,
    "auto_index": true,
    "thought_directories": [
      "thoughts/user",
      "thoughts/context",
      "thoughts/decisions",
      "thoughts/learnings",
      "thoughts/references",
      "thoughts/projects"
    ]
  }
}
```

### 5.2 Configuration Fields

**version** — The Brain Spec version this Brain conforms to.

**name** — Human-readable name for this Brain.

**description** — What this Brain is for.

**created** — When this Brain was initialized.

**settings.default_ttl** — Default TTL for new thoughts if not specified.

**settings.default_confidence** — Default confidence for new thoughts if not specified.

**settings.auto_index** — If true, the index should be automatically updated when thoughts are created, modified, or deleted.

**settings.thought_directories** — List of directories the Brain scans for thoughts. Allows custom directories to be included in indexing.

## 6. Index

### 6.1 index.json

The index is a flat lookup table for fast thought retrieval without reading every file.

```json
{
  "version": "0.1.0",
  "updated": "2026-03-16T14:22:00Z",
  "thought_count": 42,
  "thoughts": {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
      "path": "thoughts/learnings/no-mocks-in-tests.md",
      "title": "No Mocks In Integration Tests",
      "type": "learning",
      "tags": ["testing", "backend", "databases"],
      "confidence": 1.0,
      "ttl": "permanent",
      "source": "human",
      "created": "2026-03-16T10:30:00Z",
      "modified": "2026-03-16T14:22:00Z",
      "links": ["f9e8d7c6-b5a4-3210-fedc-ba0987654321"]
    }
  }
}
```

### 6.2 Index Invariants

- The index MUST be kept in sync with the thoughts on disk
- Every thought file in a scanned directory MUST have a corresponding index entry
- Every index entry MUST point to an existing thought file
- If the index is missing or corrupted, implementations MUST be able to rebuild it by scanning thought files

### 6.3 Index Queries

Implementations SHOULD support filtering the index by:
- `type` — Return all thoughts of a given type
- `tags` — Return thoughts matching any/all specified tags
- `confidence` — Return thoughts above/below a confidence threshold
- `ttl` — Return thoughts with a specific TTL
- `source` — Return thoughts from a specific source (agent/human/both)
- `modified` — Return thoughts modified within a time range
- `links` — Return thoughts linked to a specific thought ID

## 7. BRAIN.md

The `BRAIN.md` file at the Brain root serves as the entry point. Agents SHOULD read this file first when loading a Brain.

### 7.1 Required Sections

```markdown
# {Brain Name}

{Brief description of what this Brain is for}

## Instructions

{Any conventions or rules agents should follow when using this Brain}

## Key Thoughts

{Links to the most important thoughts in this Brain}
```

### 7.2 Purpose

BRAIN.md serves two audiences:
1. **Agents** — Provides context and instructions for how to use this specific Brain
2. **Humans** — Acts as a README, explaining what the Brain contains and how it's organized

## 8. Operations

The spec defines these core operations. Implementations may expose them as CLI commands, MCP tools, API endpoints, or skill instructions.

### 8.1 brain.init

Create a new Brain in a directory.

**Input:** Directory path, optional name and description
**Behavior:**
1. Create `.brain/` directory
2. Create `.brain/config.json` with defaults
3. Create `.brain/index.json` (empty)
4. Create `BRAIN.md` with template content
5. Create `thoughts/` directory with default subdirectories

**Output:** Path to the new Brain

### 8.2 brain.remember

Create a new thought.

**Input:** Type, title, content, and optional metadata (tags, confidence, ttl, links, sensitive)
**Behavior:**
1. Generate a UUID v4 for the thought
2. Determine the file path based on type (e.g., `thoughts/learnings/{slug}.md`)
3. Create the markdown file with frontmatter and body
4. Add the thought to the index
5. Update the index `updated` timestamp and `thought_count`

**Output:** The created thought's ID and path

### 8.3 brain.recall

Query thoughts from the Brain.

**Input:** Optional filters (type, tags, confidence threshold, keyword, TTL, modified range)
**Behavior:**
1. Read the index
2. Apply filters to narrow results
3. For keyword searches, read matching thought files for full-text search
4. Return matching thoughts sorted by relevance (confidence × recency)

**Output:** Array of matching thoughts (metadata + content)

### 8.4 brain.update

Modify an existing thought.

**Input:** Thought ID, updated fields (content, confidence, tags, links, ttl)
**Behavior:**
1. Read the existing thought file
2. Update the specified fields
3. Update `modified` timestamp
4. Update the index entry
5. If `source` was `human` and an agent is updating, change to `both`

**Output:** The updated thought

### 8.5 brain.forget

Remove a thought from the Brain.

**Input:** Thought ID
**Behavior:**
1. Delete the thought file from disk
2. Remove the entry from the index
3. Remove this ID from any `links` arrays in other thoughts
4. Update the index `updated` timestamp and `thought_count`

**Output:** Confirmation of deletion

### 8.6 brain.reflect

Agent self-reviews its memories for quality and consistency.

**Input:** Optional scope (all, type, tag, stale-only)
**Behavior:**
1. Scan thoughts matching the scope
2. Identify issues:
   - Contradictory thoughts (two thoughts that conflict)
   - Stale thoughts (TTL expired or confidence decayed)
   - Orphaned thoughts (no tags, no links, low confidence)
   - Duplicate thoughts (similar content, different IDs)
3. Present findings to the human for review
4. Optionally auto-fix (merge duplicates, expire stale, flag contradictions)

**Output:** Report of findings and actions taken

## 9. Brain Discovery

Agents need to find Brains. Implementations SHOULD check these locations in order:

1. **Environment variable:** `BRAIN_PATH` — Explicit path to a Brain
2. **Project-local:** `.brain/` in the current working directory
3. **User-global:** `~/.brain/` in the user's home directory

If multiple Brains are found, the agent SHOULD use all of them, with project-local taking precedence over user-global for conflicting thoughts.

## 10. Multi-Brain Support

Users may have multiple Brains (one per project, one personal, one per team). Implementations SHOULD:

- Support loading multiple Brains simultaneously
- Clearly attribute thoughts to their source Brain
- Resolve conflicts by preferring: project Brain > personal Brain > team Brain
- Never write to a Brain the agent doesn't have explicit access to

## 11. Versioning

This spec follows Semantic Versioning (SemVer):
- **Major** version: Breaking changes to the spec
- **Minor** version: New features, backwards-compatible
- **Patch** version: Clarifications, typo fixes

Current version: **0.1.0** (draft, subject to change)

## 12. License

The Brain.md Specification is released under the MIT License. Anyone may implement, extend, or build upon this spec.
