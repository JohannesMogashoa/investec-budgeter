---
name: feature-workflow
description: Orchestrate an entire specification-driven feature from authoritative requirement through spec refinement, readiness review, sequential implementation and QA, final pre-push review, and READY_TO_PUSH. Use when the user says to work, continue, execute, or take a GitHub issue/spec/feature through the project workflow. This is the normal entry point for feature work.
---

# Feature Workflow Orchestrator

You are the workflow coordinator. Do not make the developer remember the sequence of specialist skills.

Read first:

1. `AGENTS.md`
2. `.agents/skills/feature-workflow/references/lifecycle.md`
3. `.workflow/config.json`
4. the relevant specialist skill before executing each phase

Use `node scripts/workflow-check.mjs status <SPEC-ID>` whenever a spec exists to determine the next legal state from repository evidence.

## Authoritative Requirement

If starting from a GitHub issue, prefer the local GitHub CLI:

```bash
gh issue view <number> --json number,title,body,state,labels,assignees,url
```

If `gh` is unavailable due to authentication or network failure, stop and report the exact blocker. Do not silently substitute public web content for authoritative private repository information.

## State Machine

Follow this order and never skip a gate:

1. `REQUIREMENT`
2. `SPEC_DRAFT_OR_REVIEW`
3. `DECISION_REQUIRED` when unresolved human/product decisions exist
4. `SPEC_LOCKED`
5. `READINESS_REVIEW`
6. `MILESTONE_1_IMPLEMENT`
7. `MILESTONE_1_QA`
8. `MILESTONE_1_FIX` if needed, then QA again
9. Repeat implementation/QA sequentially for every remaining milestone
10. `PRE_PUSH_REVIEW`
11. `READY_TO_PUSH`

## Phase Procedures

### No spec exists
Read and execute `.agents/skills/create-spec/SKILL.md`.

### Spec is DRAFT or REVIEW
Read and execute `.agents/skills/refine-spec/SKILL.md`.

If unsupported product/domain decisions remain, stop at `DECISION_REQUIRED`. Present structured decision requests and wait for the developer's answer. Never choose product semantics merely to continue the workflow.

### Spec becomes LOCKED
Run `.agents/skills/spec-readiness-review/SKILL.md`.

- PASS: record readiness evidence and continue.
- BLOCKED: return to `refine-spec`.
- If refinement requires human decisions, stop at `DECISION_REQUIRED`.

### Milestones
Implement milestones in numeric order only.

For each milestone without valid PASS evidence:

1. Read `.agents/skills/implement-spec/SKILL.md` and implement only that milestone.
2. Read `.agents/skills/review-spec/SKILL.md` and QA that milestone.
3. If FAIL, read `.agents/skills/fix-review/SKILL.md`, fix only valid findings, then review again.
4. If `BLOCKED — SPEC UPDATE REQUIRED`, return to specification refinement; all stale evidence will be invalidated by the spec hash change.
5. After QA PASS, ensure the milestone working tree contains only the intended reviewed changes, then create the milestone commit using the spec's required commit convention. Do not push.
6. After the milestone commit is clean, run:

```bash
node scripts/workflow-record.mjs milestone <SPEC-ID> <N> PASS
```

The record command runs the required verification suite before creating PASS evidence.

Do not begin milestone N+1 until milestone N has valid PASS evidence.

### Final gate
When all milestones have valid PASS evidence:

1. Read `.agents/skills/pre-push-code-review/SKILL.md`.
2. Perform the final branch-wide review.
3. On PASS, record the exact-HEAD evidence:

```bash
node scripts/workflow-record.mjs prepush <SPEC-ID> PASS
```

4. Run:

```bash
node scripts/workflow-check.mjs prepush <SPEC-ID>
```

Only a successful result means `READY_TO_PUSH`.

## Human Intervention Rules

Pause only when:

- an authoritative requirement cannot be retrieved;
- a genuine product/domain/architecture decision has no existing authoritative answer;
- credentials/permissions require the developer;
- the environment prevents required verification;
- the final push itself needs explicit developer authorization.

Do not pause merely to ask whether to run the next mandatory workflow step.

## Push Boundary

Never execute `git push` unless the developer separately and explicitly requests the push. A successful workflow ends at:

`PASS — READY TO PUSH`
