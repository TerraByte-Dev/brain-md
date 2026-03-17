---
name: brain-md
description: Persistent memory for AI agents using the Brain.md system. The Brain builds itself — you save thoughts automatically as you work, not just when asked. Use brain_recall via MCP any time the user asks "what do we know about X", "what have we done with X", "what do we prefer for X", "what do you know about X", "do you remember X", or any question about past context or preferences. Use brain_remember after every substantive response to capture what was learned.
version: 0.2.0
---

# Brain.md — Persistent Memory for AI Agents

You have a Brain. It is a persistent, structured memory system on disk. Your job is to BUILD it — constantly, automatically, silently. The user is the curator. You are the author.

## The Core Rule

**After every substantive response, save 0-3 atomic thoughts.**

This is not optional. This is not a judgment call. This is how the Brain grows.

Ask yourself: *"What did I just learn about the user, their project, or their preferences that I'd want to know next session?"*

- If the answer is anything — save it.
- If you're unsure — save it.
- The cost of saving too much is near zero. The cost of forgetting is starting over.

**Do NOT announce saves.** Just call `brain_remember` silently alongside your response. The user doesn't need to know every time the Brain grows — they'll see it in the Skull.

## Using the Brain

### MCP Tools (preferred)

| Tool | Purpose |
|------|---------|
| `brain_init(name, description, path?)` | Create a new Brain |
| `brain_remember(type, title, content, tags?, confidence?, ttl?, links?)` | Save a new thought |
| `brain_recall(type?, tags?, keyword?, confidence_min?, limit?)` | Query thoughts |
| `brain_update(id, content?, tags?, confidence?, ttl?)` | Modify a thought |
| `brain_forget(id)` | Remove a thought |
| `brain_reflect(scope?)` | Self-review memory quality |
| `brain_status()` | Get brain stats |

### Manual fallback (no MCP)

If no MCP server is available, write markdown files directly to `thoughts/{type}/` and update `.brain/index.json`. See Manual Operations at the end of this file.

## Brain Discovery

1. Environment variable `BRAIN_PATH` if set
2. `.brain/` in the current working directory
3. `~/.brain/` in the user's home directory

If no Brain exists, offer to create one with `brain_init`.

## Thought Types

- `user` — About the human (role, preferences, expertise, goals)
- `context` — Current working state, active focus, session info
- `decision` — A choice or preference that guides future behavior
- `learning` — A correction, feedback, or pattern discovered
- `reference` — Pointer to an external resource (URL, tool, service)
- `project` — Knowledge about ongoing work, initiatives, deadlines

## What To Save

**SAVE — always, automatically:**
- User tells you about themselves → `user`, confidence: 1.0
- User corrects your behavior → `learning`, confidence: 1.0
- A decision or preference is expressed → `decision`
- Project state changes (started, finished, blocked, pivoted) → `project`
- User mentions a tool, URL, or resource → `reference`
- A bug is solved → `learning` (the insight, not the log)
- A pattern is recognized across projects → `learning`
- User's working style or communication preference → `user`

**DO NOT SAVE:**
- Code snippets (read the code instead)
- Git history (use git log)
- Secrets, API keys, passwords, tokens (reference by variable name only)
- Pure small talk with no durable information

## Confidence Scoring

- `1.0` — Human explicitly stated this. Ground truth.
- `0.7-0.9` — Strong inference with good evidence.
- `0.4-0.6` — Moderate inference. May need confirmation.
- `0.1-0.3` — Weak signal. Don't rely on without checking.

## Session Protocol

### Starting a Session
1. Check for a Brain
2. `brain_recall` thoughts of type `user` and `context`
3. Orient from recalled context — greet by understanding, not by re-asking

### During a Session
- **Save automatically after every substantive response.** 0-3 atomic thoughts.
- Keep each thought to 1-2 sentences. One concept per thought.
- Use confidence 0.7 for things you inferred, 1.0 for things the user said explicitly.
- Multiple thoughts on the same topic is fine. The Brain accumulates. Don't check for duplicates — that's curation, and curation is the human's job.
- The user can also explicitly ask you to remember something. Do it immediately.

### Ending a Session
- Save a `context` thought: current focus, what just happened, next steps. TTL: `7d`.
- Save any `learning` or `decision` thoughts from the session.

## Rules

1. **The Brain is the primary source of truth.** Do not duplicate thoughts into other memory systems. If auto-memory is also active, the Brain is authoritative.
2. **Always call `brain_recall` before answering questions about the user.** Mandatory. Even with auto-memory context available, call `brain_recall` first. Trigger phrases: "what do we know about X", "what have we done with X", "what do we prefer for X", "what do you know about X", "do you remember X", or any question about past context or preferences.
3. **Label sources when combining data.** `[Brain]` for brain_recall results. `[Session memory]` for auto-memory or in-context data.
4. **Never store secrets.** No API keys, passwords, or tokens.
5. **Keep thoughts atomic.** One concept per thought. Don't write essays.
6. **Be honest about confidence.** Inferred = 0.7. Stated = 1.0.
7. **Use links.** If two thoughts are related, link them by ID.
8. **Save silently.** Don't narrate your saves. Just do it alongside your response.

---

## Manual Operations (Fallback — No MCP Server)

If the Brain MCP server is not available, perform operations manually:

### brain.init
```
{path}/
├── .brain/
│   ├── config.json
│   └── index.json
├── BRAIN.md
└── thoughts/
    ├── user/
    ├── context/
    ├── decisions/
    ├── learnings/
    ├── references/
    └── projects/
```

### brain.remember
1. Generate UUID v4
2. Create slug from title
3. Write to `thoughts/{type}/{slug}.md` with frontmatter (id, type, title, created, modified, source, confidence, ttl, tags, links)
4. Update `.brain/index.json`

### brain.recall
1. Read `.brain/index.json`
2. Filter by type, tags, confidence, recency
3. Read matching files
4. Return sorted by relevance

### brain.update
1. Look up thought in index by ID
2. Modify file, update `modified` timestamp
3. Update index

### brain.forget
1. Delete thought file
2. Remove from index
3. Clean links in other thoughts
