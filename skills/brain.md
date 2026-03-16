# Brain.md — Persistent Memory for AI Agents

You have access to a Brain — a persistent, structured memory system stored as markdown files on disk. Use it to remember important information across sessions.

## Brain Location

Check for a Brain in this order:
1. Environment variable `BRAIN_PATH` if set
2. `.brain/` directory in the current working directory
3. `~/.brain/` in the user's home directory

If no Brain exists, offer to create one with `brain.init`.

## Core Operations

### brain.init — Create a New Brain

When the user wants to create a new Brain, or no Brain exists:

1. Create the following directory structure:
```
{target_dir}/
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

2. Write `.brain/config.json`:
```json
{
  "version": "0.1.0",
  "name": "{name provided by user or directory name}",
  "description": "{description provided by user}",
  "created": "{ISO 8601 UTC timestamp}",
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

3. Write `.brain/index.json`:
```json
{
  "version": "0.1.0",
  "updated": "{ISO 8601 UTC timestamp}",
  "thought_count": 0,
  "thoughts": {}
}
```

4. Write `BRAIN.md` with the Brain name, description, and instructions.

### brain.remember — Save a New Thought

When you learn something worth remembering (user preferences, corrections, decisions, project context, references), save it as a thought:

1. Determine the thought type:
   - `user` — About the human (role, preferences, expertise, goals)
   - `context` — Current working state, active focus
   - `decision` — A choice or preference that guides future behavior
   - `learning` — A correction, feedback, or pattern discovered
   - `reference` — Pointer to an external resource (URL, tool, service)
   - `project` — Knowledge about ongoing work, initiatives, deadlines

2. Generate a UUID v4 for the `id` field

3. Create a slug from the title (lowercase, hyphens, no special chars) for the filename

4. Write the thought file to `thoughts/{type}/{slug}.md`:
```yaml
---
id: "{uuid}"
type: {type}
title: "{title}"
created: "{ISO 8601 UTC now}"
modified: "{ISO 8601 UTC now}"
source: {agent|human|both}
confidence: {0.0-1.0}
ttl: {permanent|session|7d|30d|90d}
tags: [{relevant tags}]
links: [{IDs of related thoughts}]
---

# {Title}

{Content}

**Why:** {Reason or context}

**How to apply:** {When this is relevant}
```

5. Add the thought to `.brain/index.json`:
   - Add an entry under `thoughts` keyed by the UUID
   - Update `thought_count`
   - Update `updated` timestamp

**When to remember:**
- The user tells you something about themselves (→ `user` thought)
- The user corrects your behavior or gives feedback (→ `learning` thought, confidence: 1.0)
- An architectural or preference decision is made (→ `decision` thought)
- You learn about an ongoing project, deadline, or initiative (→ `project` thought)
- The user mentions an external tool, URL, or resource (→ `reference` thought)
- You need to persist current working state for next session (→ `context` thought)

**When NOT to remember:**
- Information already in the Brain (check first with brain.recall)
- Code patterns visible in the codebase (just read the code)
- Git history (use git log)
- Ephemeral conversation details that won't matter next session

### brain.recall — Query the Brain

Before starting work, and whenever you need context, query the Brain:

1. Read `.brain/index.json` to get the thought index
2. Filter by the relevant criteria:
   - By **type**: e.g., all `learning` thoughts
   - By **tags**: e.g., all thoughts tagged `testing`
   - By **confidence**: e.g., only thoughts with confidence >= 0.7
   - By **recency**: e.g., thoughts modified in the last 7 days
3. Read the full content of matching thought files
4. Use the recalled thoughts to inform your work

**When to recall:**
- At the **start of every session**: recall `user` and `context` thoughts to understand who you're working with and what's in progress
- Before making **decisions**: recall `decision` thoughts to check for existing preferences
- When you're **unsure** about something: recall `learning` thoughts for prior corrections
- When the user **references something external**: recall `reference` thoughts

### brain.update — Modify a Thought

When existing knowledge changes:

1. Read the thought file by looking up its path in the index
2. Update the content and/or frontmatter fields
3. ALWAYS update the `modified` timestamp
4. If a human wrote it and you're modifying it, set `source: both`
5. Update the corresponding index entry

### brain.forget — Remove a Thought

When knowledge is no longer relevant:

1. Look up the thought in the index by ID
2. Delete the thought file from disk
3. Remove the entry from `.brain/index.json`
4. Scan other thoughts' `links` arrays and remove references to the deleted ID
5. Update `thought_count` and `updated` in the index

Only forget when:
- The user explicitly asks you to forget something
- A thought with a TTL has expired
- A thought is clearly outdated and contradicted by newer information

### brain.reflect — Self-Review

Periodically (or when asked), review the Brain for quality:

1. Scan all thoughts in the index
2. Flag issues:
   - **Expired**: TTL has passed
   - **Contradictory**: Two thoughts that conflict with each other
   - **Stale**: Not modified in a long time, low confidence
   - **Orphaned**: No tags, no links, unclear relevance
   - **Duplicate**: Very similar content in multiple thoughts
3. Present findings to the user
4. With user approval, clean up (forget stale, merge duplicates, resolve contradictions)

## Session Protocol

### Starting a Session
1. Check for a Brain (see Brain Location above)
2. If Brain exists: `brain.recall` all `user` and `context` thoughts
3. Use recalled context to orient yourself — greet the user by understanding, not by asking what they were doing

### During a Session
- Remember important new information as it comes up
- Don't over-remember — only save things that will matter in future sessions
- Update existing thoughts rather than creating duplicates

### Ending a Session
- Update or create a `context` thought with: current focus, just completed, next steps
- Save any new `learning` or `decision` thoughts from the session

## Important Rules

1. **Never store secrets** in thoughts. No API keys, passwords, or tokens. Reference them by variable name only (e.g., "uses `GITHUB_PAT` for auth").
2. **Check before you remember.** Always recall first to avoid duplicates.
3. **Prefer updating over creating.** If a thought exists on the topic, update it.
4. **Respect confidence scores.** A confidence: 1.0 human-sourced thought outweighs your inferences.
5. **Be honest about confidence.** If you're inferring something, don't set confidence to 1.0.
6. **Keep thoughts atomic.** One concept per thought. Don't create mega-thoughts.
7. **Use links.** If two thoughts are related, link them by ID.
