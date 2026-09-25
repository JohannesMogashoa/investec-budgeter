# Slash Command Profile: /create-spec
Description: Ingests a Notion task ID/No. and scaffolds an isolated feature branch and spec file matching the project's repository rules.

## 🎛️ SYSTEM CONTEXT & PATH REFERENCE
- Configuration Constitution: ./AGENTS.md
- Base Blueprint: ./spec/SPEC-TEMPLATE.md
- Active Output Target: ./spec/SPEC-[TaskNo]-[Slug].md

## 🔄 PHASE 1: NOTION INGESTION GATE
When the user runs `/create-spec [Notion ID/Task No.]`, execute this sequence:
1. If an active Notion live integration is configured, query the ticket matching [Notion ID/Task No.].
2. If no live database integration is connected, immediately respond with:
   "🔌 *Notion API connection is offline. Please paste the raw text payload or description of Task #[Task No.] below to proceed.*"
3. Halt code creation. Do not execute any file writes until the text details are fetched or pasted.

## 🏗️ PHASE 2: SPECIFICATION GENERATION (Spec Architect Role)
Once the task description is available, assume the **Spec Architect Agent** persona defined in `./AGENTS.md`:
1. Parse the task parameters, requirements, and edge cases.
2. Initialize a new local Git feature branch named: `feat/spec-[TaskNo]-[short-slug]`.
3. Scaffold a new specification document at `./spec/SPEC-[TaskNo]-[slug].md`.
4. Apply the template structure from `./spec/SPEC-TEMPLATE.md` precisely.
5. Translate the Notion requirements into testable, objective, numbered Acceptance Criteria (e.g., AC-1.1, AC-1.2) using Given/When/Then styling.
6. Identify distinct development milestones/vertical slices for sequential delivery.

## 🚫 BOUNDARY CONDITIONS & CRITICAL ENFORCEMENT
- Do not output any TypeScript application code or implementation files.
- Strictly identify out-of-scope conditions to prevent feature creep.
- Mark the final generated spec document status as `Status: LOCKED` only if all failure behavior, permissions, and data exposure parameters are explicitly satisfied. If ambiguity remains, set `Status: REVIEW`.

## 📤 EXPECTED EXECUTION OUTPUT
Provide a summary response format to the developer:
"✅ Branch initialized: `feat/spec-[TaskNo]-[slug]`
📄 Spec created: `./spec/SPEC-[TaskNo]-[slug].md`
Status: [LOCKED/REVIEW]"
Followed by a quick markdown preview of the created Acceptance Criteria block.
