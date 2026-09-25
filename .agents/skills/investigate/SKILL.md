---
name: investigate
description: Perform a read-only engineering investigation into a defect, architectural question, missing behavior, or proposed change. Use when the user asks to investigate, analyze, diagnose, trace, or plan before implementation.
---

# Investigate

This is a read-only engineering workflow.

Read `AGENTS.md` and inspect relevant code, tests, specs, ADRs, and docs.

Do not write implementation files, create branches, or silently modify specs. Clearly distinguish observed facts from hypotheses and trace conclusions to repository paths/symbols.

## Output

1. Problem statement
2. Relevant repository areas
3. Current behavior
4. Expected behavior when supported by source material
5. Root-cause analysis / hypotheses
6. Security/data implications
7. Options and trade-offs
8. Recommended next engineering action
9. Specs/ADRs needing creation or revision
