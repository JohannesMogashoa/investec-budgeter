# /investigate — Read-Only Engineering Investigation

## Purpose
Investigate a defect, architectural question, missing behavior, or proposed change without modifying the repository.

## Input
`/investigate <question-or-problem>`

## Rules
- Read `AGENTS.md`.
- Inspect relevant code, tests, specs, ADRs, and docs.
- Do not write implementation files.
- Do not create branches.
- Do not alter specs unless explicitly redirected to `/create-spec` or `/refine-spec`.
- Clearly separate observed facts from hypotheses.
- Trace important conclusions to file paths/symbols.
- Identify conflicts with locked specs rather than proposing silent deviations.

## Output Structure
1. Problem statement
2. Relevant repository areas
3. Current behavior
4. Expected behavior (only when supported)
5. Root-cause analysis / hypotheses
6. Security/data implications
7. Options and trade-offs
8. Recommended next engineering action
9. Specs/ADRs that would need creation or revision
