# Brain.md — Persistent Memory for AI Agents

You have access to a Brain — a persistent, structured memory system stored as markdown files on disk. Use it to remember important information across sessions.

## Using the Brain

### If Brain MCP Server is available (preferred)

Use the MCP tools directly. Each operation is a single tool call — the server handles all file I/O, UUID generation, and index management:

| Tool | Purpose |
|------|---------|
| `brain_init(name, description, path?)` | Create a new Brain |
| `brain_remember(type, title, content, tags?, confidence?, ttl?, links?)` | Save a new thought |
| `brain_recall(type?, tags?, keyword?, confidence_min?, limit?)` | Query thoughts |
| `brain_update(id, content?, tags?, confidence?, ttl?)` | Modify a thought |
| `brain_forget(id)` | Remove a thought |
| `brain_reflect(scope?)` | Self-review memory quality |
| `brain_status()` | Get brain stats |

### If no MCP server (fallback)

Perform operations manually using file read/write tools. See the "Manual Operations" section below.

## Brain Discovery

Check for a Brain in this order:
1. Environment variable `BRAIN_PATH` if set
2. `.brain/` directory in the current working directory
3. `~/.brain/` in the user's home directory

If no Brain exists, offer to create one with `brain_init`.

## Thought Types

When remembering, classify the thought:
- `user` — About the human (role, preferences, expertise, goals)
- `context` — Current working state, active focus, session info
- `decision` — A choice or preference that guides future behavior
- `learning` — A correction, feedback, or pattern discovered
- `reference` — Pointer to an external resource (URL, tool, service)
- `project` — Knowledge about ongoing work, initiatives, deadlines

## When To Remember

**DO remember:**
- The user tells you something about themselves → `user`, confidence: 1.0
- The user corrects your behavior or gives feedback → `learning`, confidence: 1.0
- An architectural or preference decision is made → `decision`
- You learn about an ongoing project, deadline, or initiative → `project`
- The user mentions an external tool, URL, or resource → `reference`
- End of session: persist current working state → `context`, ttl: session

**Do NOT remember:**
- Information already in the Brain (check first with `brain_recall`)
- Code patterns visible in the codebase (just read the code)
- Git history (use git log)
- Ephemeral conversation details that won't matter next session
- Secrets, API keys, passwords, tokens (reference by variable name only)

## Confidence Scoring

Mark how confident you are in each thought:
- `1.0` — Human explicitly stated this. Ground truth.
- `0.7-0.9` — Strong inference with good evidence.
- `0.4-0.6` — Moderate inference. May need confirmation.
- `0.1-0.3` — Weak signal. Don't rely on without checking.

Always prefer higher-confidence thoughts when making decisions.

## Session Protocol

### Starting a Session
1. Check for a Brain
2. If Brain exists: `brain_recall` thoughts of type `user` and `context`
3. Use recalled context to orient — greet the user by understanding, not by re-asking

### During a Session
- Remember important new information as it comes up
- Don't over-remember — only save things that will matter in future sessions
- Update existing thoughts rather than creating duplicates (`brain_update`, not new `brain_remember`)

### Ending a Session
- `brain_update` or `brain_remember` a `context` thought with: current focus, just completed, next steps
- Save any new `learning` or `decision` thoughts from the session

## Important Rules

1. **The Brain is the single source of truth.** Do not duplicate thoughts into any other memory system (auto-memory, local notes, context). The Brain is where all persistent knowledge lives. Do not say "I'll save this to local memory so I don't need the Brain MCP" — that defeats the purpose.
2. **Always query the Brain before answering from memory.** When the user asks what you know about them, their preferences, or their projects, call `brain_recall` first. Do not answer from in-context memory alone.
3. **Never store secrets.** No API keys, passwords, or tokens. Reference by variable name only.
4. **Check before you remember.** Always `brain_recall` first to avoid duplicates.
5. **Prefer updating over creating.** If a thought exists on the topic, `brain_update` it.
6. **Respect confidence scores.** A confidence: 1.0 human-sourced thought outweighs your inferences.
7. **Be honest about confidence.** If you're inferring, don't set confidence to 1.0.
8. **Keep thoughts atomic.** One concept per thought. Don't create mega-thoughts.
9. **Use links.** If two thoughts are related, link them by ID.

---

## Manual Operations (Fallback — No MCP Server)

If the Brain MCP server is not available, perform operations manually:

### brain.init
Create this structure:
```
{path}/
├── .brain/
│   ├── config.json    # {"version":"0.1.0","name":"...","created":"...","settings":{...}}
│   └── index.json     # {"version":"0.1.0","updated":"...","thought_count":0,"thoughts":{}}
├── BRAIN.md           # Entry point with name, description, instructions
└── thoughts/
    ├── user/
    ├── context/
    ├── decisions/
    ├── learnings/
    ├── references/
    └── projects/
```

### brain.remember
1. Generate a UUID v4 for the thought ID
2. Create slug from title (lowercase, hyphens, no special chars)
3. Write thought to `thoughts/{type}/{slug}.md` with frontmatter:
```yaml
---
id: "{uuid}"
type: {type}
title: "{title}"
created: "{ISO 8601 UTC}"
modified: "{ISO 8601 UTC}"
source: agent | human | both
confidence: {0.0-1.0}
ttl: permanent | session | 7d | 30d | 90d
tags: [{tags}]
links: [{related thought IDs}]
---

# {Title}

{Content}

**Why:** {Reason or context}

**How to apply:** {When this is relevant}
```
4. Update `.brain/index.json`: add entry, increment `thought_count`, update `updated`

### brain.recall
1. Read `.brain/index.json`
2. Filter by type, tags, confidence, recency
3. Read matching thought files
4. Return content sorted by relevance (confidence x recency)

### brain.update
1. Look up thought path in index by ID
2. Read and modify the thought file
3. Update `modified` timestamp
4. If human-authored and agent is updating, set `source: both`
5. Update index entry

### brain.forget
1. Look up thought in index by ID
2. Delete the thought file
3. Remove from index, update `thought_count` and `updated`
4. Remove this ID from `links` arrays in other thoughts
