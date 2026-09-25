---
name: explain-project
description: Explain repository architecture, code, data flow, tests, or contributor extension points using the repository as the source of truth. Use when a contributor asks how a project area works.
---

# Explain Project Area

Read `AGENTS.md` and prefer existing specs, ADRs, docs, code, and tests over assumptions.

Do not modify files. State when behavior is undocumented or ambiguous. Call out security and financial-data boundaries when relevant.

Explain:
1. What it is
2. Why it exists
3. Key files/modules
4. Data/control flow
5. Important invariants
6. Testing/verification
7. Safe extension points
8. Things contributors must not change casually
