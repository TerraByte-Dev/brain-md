---
id: "a1b2c3d4-2222-4000-a000-000000000002"
type: decision
title: "Always Use TypeScript"
created: "2026-03-16T10:15:00Z"
modified: "2026-03-16T10:15:00Z"
source: human
confidence: 1.0
ttl: permanent
tags: [language, frontend, backend]
links: []
---

# Always Use TypeScript

All new code should be written in TypeScript, not JavaScript. This applies to both frontend (React) and backend (Node.js) code.

**Why:** Alex's team adopted TypeScript company-wide after a production incident caused by a type error in plain JS. Strong typing catches bugs at compile time.

**How to apply:** When creating new files, always use `.ts` or `.tsx`. When modifying existing `.js` files, convert them to TypeScript if the change is significant enough to warrant it.
