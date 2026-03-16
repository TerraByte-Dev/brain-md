---
id: "a1b2c3d4-3333-4000-a000-000000000003"
type: learning
title: "No Mocks In Integration Tests"
created: "2026-03-16T11:00:00Z"
modified: "2026-03-16T14:22:00Z"
source: human
confidence: 1.0
ttl: permanent
tags: [testing, backend, databases]
links: ["a1b2c3d4-2222-4000-a000-000000000002"]
---

# No Mocks In Integration Tests

Integration tests must hit a real database, not mocks.

**Why:** Last quarter, mocked tests passed but the prod migration failed. The mock didn't reflect a schema change that broke the actual queries. Took 4 hours to diagnose in production.

**How to apply:** When writing or reviewing integration tests, always use a real database connection (test database, not production). Only use mocks for unit tests of pure logic with no I/O.
