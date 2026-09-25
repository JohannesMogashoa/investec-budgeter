#!/usr/bin/env node
/* global console, process */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const PREDICATE_TYPE = 'https://investec-budgeter.dev/workflow-attestation/v1';

function fail(message) {
  throw new Error(message);
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(sortValue(value))}\n`;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function validateEvidence(evidence) {
  if (!Array.isArray(evidence) || evidence.length === 0)
    fail('Attestation evidence must contain at least one entry.');
  const order = { readiness: 0, milestone: 1, prepush: 2 };
  let previous = -1;
  for (const item of evidence) {
    if (!item || !Object.hasOwn(order, item.type)) fail('Attestation evidence type is invalid.');
    if (item.verification !== 'PASS') fail('Only PASS evidence may be attested.');
    if (item.type === 'milestone' && !Number.isInteger(item.milestone))
      fail('Milestone evidence must contain an integer milestone.');
    if (item.type !== 'milestone' && item.milestone !== null)
      fail('Readiness and pre-push evidence must use a null milestone.');
    if (order[item.type] < previous) fail('Attestation evidence is not in lifecycle order.');
    previous = order[item.type];
  }
}

export function buildManifest(input) {
  const required = [
    'repository',
    'baseBranch',
    'pullRequestNumber',
    'headCommit',
    'spec',
    'evidence',
    'workflow',
    'issuedAt',
  ];
  for (const field of required)
    if (input?.[field] === undefined) fail(`Missing manifest field: ${field}`);
  if (!/^\d+$/.test(String(input.pullRequestNumber))) fail('Pull request number must be numeric.');
  if (!/^[0-9a-f]{40}$/.test(input.headCommit)) fail('Head commit must be a 40-character SHA-1.');
  if (!/^[0-9a-f]{64}$/.test(input.spec?.sha256)) fail('Spec hash must be lowercase SHA-256.');
  validateEvidence(input.evidence);

  const manifest = {
    schemaVersion: 1,
    repository: input.repository,
    baseBranch: input.baseBranch,
    pullRequestNumber: Number(input.pullRequestNumber),
    headCommit: input.headCommit,
    spec: {
      id: input.spec.id,
      path: input.spec.path,
      sha256: input.spec.sha256,
    },
    evidence: input.evidence,
    workflow: {
      name: input.workflow.name,
      file: input.workflow.file,
      runId: Number(input.workflow.runId),
      issuer: 'github-actions',
    },
    issuedAt: input.issuedAt,
    expiresAt: null,
  };
  const withoutId = canonicalJson(manifest);
  manifest.attestationId = sha256(withoutId);
  return manifest;
}

export function validateManifest(manifest) {
  const rebuilt = buildManifest(manifest);
  if (manifest.attestationId !== rebuilt.attestationId)
    fail('Manifest attestationId does not match its content.');
  if (canonicalJson(manifest) !== canonicalJson(rebuilt))
    fail('Manifest is not canonical or contains unsupported fields.');
  return true;
}

export function verifyGhResult(output, { repository, signerWorkflow, subjectDigest }) {
  let results;
  try {
    results = JSON.parse(output);
  } catch {
    fail('GitHub attestation verification returned invalid JSON.');
  }
  if (!Array.isArray(results) || results.length === 0)
    fail('GitHub returned no valid attestation.');
  const match = results.find((entry) => {
    const verification = entry?.verificationResult;
    const certificate = verification?.signature?.certificate ?? {};
    const subjects = verification?.statement?.subject ?? [];
    const digestMatch = subjects.some((subject) => subject?.digest?.sha256 === subjectDigest);
    const repositoryMatch =
      certificate.sourceRepository === repository || certificate.SourceRepository === repository;
    return (
      digestMatch &&
      repositoryMatch &&
      verification.statement.predicateType === PREDICATE_TYPE &&
      (!signerWorkflow ||
        certificate.workflowName === signerWorkflow ||
        certificate.WorkflowName === signerWorkflow ||
        certificate.subjectAlternativeName === signerWorkflow)
    );
  });
  if (!match) fail('GitHub attestation does not match repository, signer, predicate, or subject.');
  return match;
}

export function verifyAttestation({ subjectPath, repository, signerWorkflow }) {
  const subject = fs.readFileSync(subjectPath);
  validateManifest(JSON.parse(subject.toString('utf8')));
  const output = execFileSync(
    'gh',
    [
      'attestation',
      'verify',
      subjectPath,
      '--repo',
      repository,
      '--signer-workflow',
      signerWorkflow,
      '--predicate-type',
      PREDICATE_TYPE,
      '--format',
      'json',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return verifyGhResult(output, {
    repository,
    signerWorkflow,
    subjectDigest: sha256(subject),
  });
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) fail(`Missing ${name} option.`);
  return args[index + 1];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, ...args] = process.argv.slice(2);
  try {
    if (command === 'manifest') {
      const inputPath = readOption(args, '--input');
      const outputPath = readOption(args, '--output');
      const manifest = buildManifest(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
      fs.writeFileSync(outputPath, canonicalJson(manifest));
      console.log(`Wrote canonical workflow attestation manifest: ${outputPath}`);
    } else if (command === 'verify') {
      verifyAttestation({
        subjectPath: readOption(args, '--subject'),
        repository: readOption(args, '--repo'),
        signerWorkflow: readOption(args, '--signer-workflow'),
      });
      console.log('Verified GitHub-hosted workflow attestation.');
    } else {
      fail(
        'Usage: workflow-attestation.mjs manifest --input FILE --output FILE | verify --subject FILE --repo OWNER/REPO --signer-workflow WORKFLOW',
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
