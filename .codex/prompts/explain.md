# /explain — Contributor-Oriented Repository Explanation

## Purpose
Explain an area of the project to a contributor using the repository itself as the source of truth.

## Input
`/explain <topic/path/symbol>`

## Rules
- Read `AGENTS.md`.
- Prefer existing specs, ADRs, docs, code, and tests over assumptions.
- Do not modify files.
- State when behavior is undocumented or ambiguous.
- Explain how the requested area fits into the larger architecture.
- Call out security or financial-data boundaries when relevant.

## Output
Provide:
1. What it is
2. Why it exists
3. Key files/modules
4. Data/control flow
5. Important invariants
6. Testing/verification
7. Safe extension points
8. Things contributors must not change casually
