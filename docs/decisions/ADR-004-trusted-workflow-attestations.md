# ADR-004: GitHub-Hosted Workflow Attestations

- **Status:** Proposed
- **Date:** 2026-09-25
- **Decision Owners:** Repository owner / workflow maintainers
- **Related Specs:** SPEC-10
- **Supersedes:** N/A

## Context

The feature workflow currently uses locally editable JSON attestations. Schema and commit/hash checks detect stale or malformed records, but local files cannot prove that the claimed review actually occurred. A trusted remote issuer is required for tamper-evident workflow approvals.

GitHub Actions artifact attestations provide signed provenance claims for workflow-produced artifacts. GitHub documents the required `id-token: write` and `attestations: write` permissions, the `actions/attest@v4` action, and verification through `gh attestation verify`.

## Decision Drivers

- Use an issuer already integrated with the repository's pull-request and branch-protection workflow.
- Avoid private signing keys and bearer credentials in the repository.
- Bind approvals to repository, workflow, commit, spec hash, milestone, and verification evidence.
- Fail closed when trusted verification is unavailable.
- Preserve the existing sequential lifecycle and financial-data security boundary.

## Decision

Use a protected GitHub Actions workflow to generate a canonical workflow-attestation manifest and create a GitHub-hosted artifact attestation for that manifest with `actions/attest@v4`. Verification uses `gh attestation verify` against the repository and validates the manifest predicate.

The trusted issuer workflow must be `.github/workflows/feature-workflow-attestation.yml`, run from the trusted base-branch workflow definition after `Feature Workflow Gate`, and expose the required check `Feature Workflow Attestation / attest`. Repository rulesets for `development`, `staging`, and `master` must require that check for applicable pull requests. The issuer workflow and supporting verifier code must require an authorized maintainer approval, dismiss stale approvals on new pushes, and prevent the last pusher from supplying the sole approval.

The first push of a new feature branch is allowed before GitHub can issue an attestation. This bootstrap push is not workflow completion: merge and deployment remain blocked until the trusted attestation and protected checks pass.

## Consequences

### Positive

- Local evidence edits cannot alter an accepted signed manifest.
- GitHub supplies repository/workflow/commit provenance and an established verification path.
- No developer-managed private signing key is required.

### Negative / Trade-offs

- The authoritative verification path depends on GitHub availability unless a trusted offline bundle is provisioned.
- The candidate commit must be published before GitHub Actions can issue an attestation.
- Repository rulesets and workflow protection become part of the security boundary.
- The first feature-branch push has a deliberate bootstrap exception; diagnostics and protected checks must prevent it from being mistaken for merge or deployment approval.

### Risks

- A workflow with attestation write permission that is itself modifiable by untrusted contributors could mint misleading attestations.
- A permissive ruleset or reviewer configuration could authorize an attestation without the intended human review.

## Security & Data Impact

The attested manifest contains hashes, commit/spec/milestone identifiers, workflow identity, and verification results only. It must never contain credentials, account identifiers, provider payloads, or access tokens. Workflow permissions must be least-privilege: `contents: read`, `id-token: write`, `attestations: write`, and `artifact-metadata: write` for the attestation subject record, with no unnecessary write permissions.

## Operational Impact

Maintainers must configure and periodically review the protected issuer workflow, required checks, reviewer/environment rules, and GitHub attestation verification policy. Migration must invalidate legacy unsigned `.workflow/local` PASS records rather than treating them as equivalent.

## Current Repository Confirmation

As of 2026-09-25, the repository has no attestation-issuing workflow, no attestation-specific required status check, and no configured reviewer protection for the issuer. Existing rulesets protect branch deletion and require existing checks on `master`, but they do not yet establish the attestation trust boundary. SPEC-10 defines these as Milestone 1 implementation requirements.

## Validation

Implementation review must demonstrate successful attestation issuance and `gh attestation verify`, plus failure for altered manifests, replayed attestations, wrong repositories/specs/milestones/commits, missing trust material, and protected-workflow changes.

## Revisit Conditions

- GitHub removes or materially changes artifact-attestation support.
- Repository ownership, privacy, or availability requirements make GitHub-hosted verification unsuitable.
- The repository changes its branch, merge, or deployment controls and the bootstrap boundary must be reconsidered.
