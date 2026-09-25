# 📋 SPEC-10: Trusted Workflow Attestations

- **Version:** 1.0.0
- **Status:** `LOCKED`
- **Tracked Issue(s):** Remaining limitation from the automated feature-workflow audit
- **Target Branch:** `feat/spec-10-trusted-workflow-attestations`

---

## 🎯 1. Executive Summary & Context

The current workflow validates the shape and freshness of JSON files under `.workflow/local/`, but a contributor who can edit local evidence can construct correctly shaped PASS records without performing the corresponding review. This specification defines the requirements for a trusted attestation mechanism that can distinguish genuine workflow approvals from edited, replayed, cross-spec, or cross-repository records.

The mechanism must preserve the repository lifecycle and must not treat local evidence as product truth. It must establish an authoritative trust boundary for readiness, milestone QA, and pre-push approvals.

---

## 🛑 2. Scope & Boundaries

### 🟩 In-Scope

- A trust model and authoritative issuer for workflow attestations.
- A versioned, canonical attestation schema for readiness, milestone QA, and pre-push PASS results.
- Cryptographic or server-verifiable integrity protection against payload edits and replay.
- Binding attestations to repository identity, spec identity, exact spec hash, milestone, reviewed commit, verification result, reviewer identity, and issuance time.
- Fail-closed verification and actionable diagnostics when an attestation is missing, altered, expired, replayed, or issued for another repository/spec/commit.
- Migration behavior for existing `.workflow/local` evidence and local hooks.

### 🟥 Out-of-Scope (Exclusions)

- Product behavior, financial data processing, or Apps Script deployment behavior.
- Authorization to merge or deploy beyond the existing repository and GitHub controls.
- Trust in a deliberately compromised repository owner account or compromised external attestation issuer.
- Storing credentials, private keys, tokens, or raw financial payloads in the repository.

---

## 🛠️ 3. Technical Design & Interface Contracts

### 3.1 Required Attestation Fields

The final design must define a canonical, versioned envelope containing at least:

- repository identity and target branch;
- spec ID, spec path, and exact spec hash;
- evidence type and milestone number where applicable;
- reviewed commit and relevant parent/base commit;
- verification command and result, including a reproducible result reference;
- reviewer/issuer identity and authorization context;
- issued-at time, expiry/revocation semantics, and unique attestation ID;
- integrity proof and algorithm/version metadata.

Canonical serialization, field ordering, encoding, and normalization must be explicitly defined before implementation.

The canonical manifest must be UTF-8 JSON with one trailing newline, object keys sorted lexicographically at every level, arrays ordered as specified below, and no insignificant whitespace other than the final newline. It must contain exactly these top-level fields:

```json
{
  "schemaVersion": 1,
  "repository": "OWNER/REPOSITORY",
  "baseBranch": "development",
  "pullRequestNumber": 123,
  "headCommit": "40-hex-sha",
  "spec": {
    "id": "SPEC-10",
    "path": "spec/SPEC-10-trusted-workflow-attestations.md",
    "sha256": "64-lowercase-hex"
  },
  "evidence": [
    {
      "type": "readiness",
      "milestone": null,
      "verification": "PASS",
      "verificationCommand": "npm run verify",
      "verificationReference": "workflow-run:123456789",
      "reviewer": "github-login",
      "authorization": "required-maintainer-review",
      "reviewedAt": "RFC-3339-UTC"
    }
  ],
  "workflow": {
    "name": "Feature Workflow Attestation",
    "file": ".github/workflows/feature-workflow-attestation.yml",
    "runId": 123456789,
    "issuer": "github-actions"
  },
  "issuedAt": "RFC-3339-UTC",
  "expiresAt": null,
  "attestationId": "64-lowercase-hex"
}
```

`evidence` is ordered by lifecycle stage (`readiness`, milestone number ascending, then `prepush`). `milestone` is `null` only for readiness and pre-push evidence. `attestationId` is the SHA-256 digest of the canonical manifest bytes. GitHub is the revocation authority: `expiresAt` is always `null`, and an attestation is revoked when GitHub verification no longer returns a valid attestation for the exact subject and repository. The verifier must not accept a locally supplied expiry or revocation field.

### 3.2 State Transitions & Invariants

- A locally editable copy of an attestation cannot be accepted after any signed/authoritative field is changed.
- An attestation issued for one repository, spec hash, milestone, or commit cannot authorize another.
- Replaying an old valid attestation after a spec, branch, or HEAD change is rejected.
- Missing issuer trust material, invalid signatures, unsupported algorithms, expired attestations, and revoked attestations fail closed.
- Existing lifecycle order remains unchanged: readiness precedes implementation, milestones remain sequential, and pre-push remains exact-HEAD only.
- No private key or bearer credential is committed, logged, or written into `.workflow/local`.

### 3.3 Selected Architecture: GitHub-hosted Artifact Attestations

The repository will use GitHub Actions artifact attestations as the authoritative remote integrity mechanism. A trusted workflow will generate a canonical workflow-attestation manifest as a small artifact and attest it with GitHub's `actions/attest@v4` action. The workflow must grant only the permissions required by GitHub's attestation contract:

- `contents: read`;
- `id-token: write`; and
- `attestations: write`.

The manifest must contain only workflow identifiers, hashes, commit references, review/verification results, and non-sensitive metadata. It must not contain credentials, account data, provider payloads, or bearer tokens. Verification must use `gh attestation verify` against this repository and inspect the predicate contents, repository identity, workflow identity, commit, and spec/milestone bindings.

The attestation workflow itself must be protected by repository rulesets and required review/status controls so an untrusted pull request cannot replace the trusted issuer workflow while minting an apparently valid attestation. The exact protected workflow name, environment reviewer set, and ruleset configuration are implementation/deployment details that must be documented before implementation completes.

The issuer workflow must be `.github/workflows/feature-workflow-attestation.yml` with workflow name `Feature Workflow Attestation`. It must run from the trusted base-branch workflow definition after the successful `Feature Workflow Gate` result for the candidate pull request, use the candidate head SHA as the attestation binding, and never execute untrusted pull-request code. Its attestation job must expose the required check context `Feature Workflow Attestation / attest`.

The repository ruleset for `development`, `staging`, and `master` must require this attestation check. The issuer workflow file and its supporting verifier code must require an approving review from an authorized repository maintainer (a GitHub collaborator with `maintain` or `admin` repository role), dismiss stale approvals on new pushes, and prevent the last pusher from supplying the sole approval. The ruleset and reviewer policy must be documented and checked into the repository configuration documentation before Milestone 1 is complete.

The attestation workflow must run for every pull request targeting `development`, `staging`, or `master`, without a path filter, so the required check is never left pending because of a skipped workflow. For changes outside the workflow-governed paths, it must publish a successful `NOT_APPLICABLE` result and no attestation is required. For governed changes, it must publish the attestation and fail if the attestation cannot be verified.

GitHub documents artifact attestations as provenance for artifacts and provides online and offline verification through the GitHub CLI. The workflow must therefore attest the canonical manifest artifact, not individual source or documentation files.

### 3.4 Unresolved Bootstrap Decision

GitHub Actions can issue the attestation only after the candidate commit is available to GitHub. The first push of a new feature branch is therefore permitted without a remote attestation. The push must not be described as workflow-complete: pull-request merge and deployment remain blocked until the trusted GitHub attestation and all protected checks pass.

The implementation must make this boundary explicit in diagnostics and documentation. It must not claim that a GitHub attestation exists before the candidate commit is published. Subsequent pushes, merge eligibility, and deployment eligibility must use the authoritative GitHub-hosted attestation flow.

---

## ⚡ 4. Failure Modes & Error Behavior

The verifier must return deterministic blocking outcomes for:

- missing or malformed attestation;
- altered payload or invalid integrity proof;
- wrong repository, spec ID/path/hash, milestone, branch, or commit;
- stale, expired, revoked, or replayed attestation;
- unknown issuer, unsupported algorithm, unavailable trust material, or unavailable authoritative service;
- an existing legacy JSON-only evidence record during migration.

Each failure must identify the next legal workflow action without exposing signatures, private keys, tokens, or financial data.

For the selected GitHub-hosted design, online verification is the default. Offline verification is permitted only when a trusted GitHub attestation bundle and trusted-root material are explicitly provisioned and validated. Otherwise issuer/API unavailability fails closed. The bootstrap boundary is the explicit first-push exception in Section 3.4; it does not authorize merge or deployment.

Legacy migration is one-way: existing `.workflow/local/<SPEC-ID>/` JSON files are treated as untrusted from the first implementation commit, are never imported into the canonical manifest as PASS evidence, and may be retained only for diagnostic comparison. The first GitHub attestation must be generated from fresh workflow results on the candidate pull request. Once Milestone 3 is enabled, local status, merge, and deployment checks must reject legacy-only evidence.

---

## 🔒 5. Security & Sensitive Data Rules

- The threat model must distinguish accidental local edits, unauthorized contributor edits, compromised reviewer credentials, and compromised repository-owner controls.
- Trust anchors and reviewer authorization must use least privilege and documented rotation/revocation procedures.
- Private signing material must remain outside the repository and outside logs/artifacts.
- Attestation payloads must contain identifiers and hashes only; never credentials, account data, provider payloads, or access tokens.
- Verification must not silently downgrade to unsigned JSON evidence.

---

## 📈 6. Implementation Milestones (Vertical Slices)

### 📍 Milestone 1: Resolve bootstrap boundary and attestation contract

- **Focus:** Define the GitHub trusted workflow, canonical envelope, reviewer authorization, lifecycle bindings, migration, first-push boundary, and failure behavior. Requires an ADR before implementation.
- **Target Commit Scope:** `docs(workflow): spec-10 milestone-1 define trusted attestations`

### 📍 Milestone 2: Implement authoritative issuance and verification

- **Focus:** Replace acceptance of unsigned local PASS JSON with the selected trusted attestation flow and add tamper/replay/cross-context tests.
- **Target Commit Scope:** `feat(workflow): spec-10 milestone-2 verify trusted attestations`

### 📍 Milestone 3: Integrate local hooks and repository gates

- **Focus:** Enforce the verifier in workflow status, record, pre-push, and Codex/GitHub boundaries; document migration and recovery operations.
- **Target Commit Scope:** `feat(workflow): spec-10 milestone-3 enforce trusted workflow gates`

---

## ✅ 7. Numbered Acceptance Criteria (AC)

### Readiness / Architecture Criteria

- **AC-0.1:** The selected GitHub-hosted design identifies the authoritative workflow issuer, `actions/attest@v4` attestation subject, `gh attestation verify` verifier policy, repository/ruleset trust boundary, reviewer authorization source, and availability behavior.
- **AC-0.2:** The canonical attestation schema defines deterministic serialization and binds repository, spec, milestone, reviewed commit, verification result, reviewer/issuer, timestamp, expiry, and unique identity.
- **AC-0.3:** The migration plan defines how all legacy unsigned `.workflow/local` evidence is invalidated or explicitly re-attested without silently authorizing it.
- **AC-0.4:** The first feature-branch push is explicitly allowed before remote attestation, while merge and deployment remain blocked until the trusted GitHub attestation and protected checks pass; diagnostics distinguish this bootstrap state from `READY_TO_PUSH`.

### Milestone 2 Criteria

- **AC-2.1:** Given any edit to a signed/authoritative attestation payload, verification fails and the workflow remains blocked.
- **AC-2.2:** Given a valid attestation copied to another repository, spec, milestone, branch, or commit, verification fails.
- **AC-2.3:** Given a valid attestation after the spec hash or reviewed `HEAD` changes, verification fails and the next legal workflow gate is reported.
- **AC-2.4:** Given missing, unavailable, expired, revoked, or unsupported trust material, verification fails closed without exposing sensitive data.

### Milestone 3 Criteria

- **AC-3.1:** `workflow-check`, `workflow-record`, `.githooks/pre-push`, and the Codex PreToolUse hook all use the authoritative verifier and cannot fall back to unsigned JSON PASS evidence.
- **AC-3.2:** The full lifecycle simulation proves that valid trusted attestations permit only the intended next action and that all tamper/replay cases remain blocked.
- **AC-3.3:** `npm run verify` passes and documentation describes issuance, verification, rotation/revocation, migration, outage recovery, and audit evidence handling.

---

## 🧪 8. Testing Verification Checklist

Before implementation begins, the readiness review must approve the trust model, contract, and migration decisions. Implementation testing must cover canonical serialization, altered payloads, replay, cross-repository/spec/milestone/commit use, expiry/revocation, issuer outage, key rotation, legacy evidence, local hook behavior, and complete lifecycle transitions.

---

## Open Decisions / Required ADR

The GitHub-hosted architecture and first-push boundary are selected. The current repository configuration does not yet provide the protected attestation issuer, attestation-required status check, or reviewer protection required by this specification. Milestone 1 must implement and validate those controls and record the final configuration in `docs/decisions/ADR-004-trusted-workflow-attestations.md`; this known implementation gap does not permit bypassing the readiness or QA gates.
