import { describe, expect, it } from 'vitest';

const { buildManifest, canonicalJson, sha256, validateManifest, verifyGhResult } =
  await import('../../scripts/workflow-attestation.mjs');

const input = {
  repository: 'OWNER/REPOSITORY',
  baseBranch: 'development',
  pullRequestNumber: 123,
  headCommit: 'a'.repeat(40),
  spec: {
    id: 'SPEC-10',
    path: 'spec/SPEC-10-trusted-workflow-attestations.md',
    sha256: 'b'.repeat(64),
  },
  evidence: [
    {
      type: 'readiness',
      milestone: null,
      verification: 'PASS',
      verificationCommand: 'npm run verify',
      verificationReference: 'workflow-run:123456789',
      reviewer: 'maintainer',
      authorization: 'required-maintainer-review',
      reviewedAt: '2026-09-25T00:00:00Z',
    },
  ],
  workflow: {
    name: 'Feature Workflow Attestation',
    file: '.github/workflows/feature-workflow-attestation.yml',
    runId: 123456789,
  },
  issuedAt: '2026-09-25T00:00:00Z',
};

describe('trusted workflow attestation manifest', () => {
  it('produces deterministic canonical content and self-validating identity', () => {
    const manifest = buildManifest(input);
    expect(validateManifest(manifest)).toBe(true);
    expect(canonicalJson(manifest)).toContain('"attestationId"');
    expect(manifest.attestationId).toHaveLength(64);
  });

  it('rejects edits, unsupported fields, and non-PASS evidence', () => {
    const manifest = buildManifest(input);
    expect(() => validateManifest({ ...manifest, headCommit: 'c'.repeat(40) })).toThrow(
      'attestationId',
    );
    expect(() => validateManifest({ ...manifest, unexpected: true })).toThrow('canonical');
    expect(() =>
      buildManifest({ ...input, evidence: [{ ...input.evidence[0], verification: 'FAIL' }] }),
    ).toThrow('Only PASS');
  });

  it('rejects replay and cross-context GitHub verification results', () => {
    const manifest = buildManifest(input);
    const subjectDigest = sha256(canonicalJson(manifest));
    const result = [
      {
        verificationResult: {
          signature: {
            certificate: { sourceRepository: 'OTHER/REPOSITORY', workflowName: 'wrong.yml' },
          },
          statement: {
            predicateType: 'https://investec-budgeter.dev/workflow-attestation/v1',
            subject: [{ digest: { sha256: subjectDigest } }],
          },
        },
      },
    ];
    expect(() =>
      verifyGhResult(JSON.stringify(result), {
        repository: input.repository,
        signerWorkflow: '.github/workflows/feature-workflow-attestation.yml',
        subjectDigest,
      }),
    ).toThrow('does not match');
    expect(() =>
      validateManifest({
        ...manifest,
        spec: { ...input.spec, sha256: 'd'.repeat(64) },
      }),
    ).toThrow('attestationId');
    expect(() => validateManifest({ ...manifest, headCommit: 'e'.repeat(40) })).toThrow(
      'attestationId',
    );
  });

  it('fails closed for missing or malformed GitHub attestations', () => {
    expect(() =>
      verifyGhResult('not-json', {
        repository: input.repository,
        signerWorkflow: '.github/workflows/feature-workflow-attestation.yml',
        subjectDigest: 'f'.repeat(64),
      }),
    ).toThrow('invalid JSON');
    expect(() =>
      verifyGhResult('[]', {
        repository: input.repository,
        signerWorkflow: '.github/workflows/feature-workflow-attestation.yml',
        subjectDigest: 'f'.repeat(64),
      }),
    ).toThrow('no valid attestation');
  });

  it('accepts only the expected repository, signer, predicate, and subject', () => {
    const manifest = buildManifest(input);
    const subjectDigest = sha256(canonicalJson(manifest));
    const result = [
      {
        verificationResult: {
          signature: {
            certificate: {
              sourceRepository: input.repository,
              workflowName: '.github/workflows/feature-workflow-attestation.yml',
            },
          },
          statement: {
            predicateType: 'https://investec-budgeter.dev/workflow-attestation/v1',
            subject: [{ digest: { sha256: subjectDigest } }],
          },
        },
      },
    ];
    expect(
      verifyGhResult(JSON.stringify(result), {
        repository: input.repository,
        signerWorkflow: '.github/workflows/feature-workflow-attestation.yml',
        subjectDigest,
      }),
    ).toStrictEqual(result[0]);
  });
});
