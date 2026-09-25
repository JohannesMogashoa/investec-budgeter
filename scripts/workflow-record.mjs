#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import {
  findSpec,
  specHash,
  headCommit,
  currentBranch,
  evidenceFile,
  runVerify,
  statusFor,
  isClean,
  validReadiness,
  milestones,
  specStatus,
  validTrustedAttestation,
  isBootstrapPush,
} from './workflow-lib.mjs';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
function write(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Recorded ${payload.type} evidence: ${path.relative(process.cwd(), file)}`);
}

const [type, specArg, detail, verdictArg] = process.argv.slice(2);
const verdict = (type === 'milestone' ? verdictArg : detail || '').toUpperCase();
if (!['readiness', 'milestone', 'prepush'].includes(type))
  fail(
    'Usage: workflow-record.mjs readiness <SPEC> PASS | milestone <SPEC> <N> PASS | prepush <SPEC> PASS',
  );
if (verdict !== 'PASS')
  fail('Only PASS evidence is persisted. Failed/blocked reviews must not create passing evidence.');

let spec;
try {
  spec = findSpec(specArg);
} catch (e) {
  fail(e.message);
}
const base = {
  schemaVersion: 1,
  type,
  specId: spec.id,
  specPath: spec.relativePath,
  specHash: specHash(spec.text),
  verdict: 'PASS',
  branch: currentBranch(),
  reviewedCommit: headCommit(),
  recordedAt: new Date().toISOString(),
};

if (type === 'readiness') {
  if (specStatus(spec.text) !== 'LOCKED')
    fail('Cannot record readiness PASS unless the specification is LOCKED.');
  write(evidenceFile(spec.id, 'readiness'), base);
  process.exit(0);
}

if (!validReadiness(spec))
  fail('Cannot record implementation evidence before a valid spec-readiness PASS.');

if (type === 'milestone') {
  if (!isClean())
    fail(
      'Cannot record milestone PASS while the Git working tree is dirty. Commit the reviewed milestone first.',
    );
  const n = Number(detail);
  if (!Number.isInteger(n) || n < 1) fail('Milestone number must be a positive integer.');
  const declared = milestones(spec.text);
  if (!declared.includes(n)) fail(`Milestone ${n} is not declared by ${spec.id}.`);
  for (const prior of declared.filter((x) => x < n)) {
    const state = statusFor(spec);
    const found = state.milestones.find((x) => x.milestone === prior);
    if (!found?.pass)
      fail(`Cannot record milestone ${n}; milestone ${prior} has no valid PASS evidence.`);
  }
  runVerify();
  write(evidenceFile(spec.id, 'milestone', n), { ...base, milestone: n, verification: 'PASS' });
  process.exit(0);
}

if (type === 'prepush') {
  const state = statusFor(spec);
  if (!state.milestones.length || state.milestones.some((x) => !x.pass))
    fail('Cannot record pre-push PASS until every milestone has valid QA PASS evidence.');
  if (!isClean())
    fail(
      'Cannot record pre-push PASS while the Git working tree is dirty. Commit/stash intended changes first.',
    );
  if (!validTrustedAttestation(spec) && !isBootstrapPush())
    fail('Cannot record pre-push PASS without a valid GitHub-hosted workflow attestation.');
  runVerify();
  if (!isClean())
    fail(
      'Verification changed the working tree; pre-push PASS cannot be recorded until generated changes are resolved.',
    );
  write(evidenceFile(spec.id, 'prepush'), { ...base, verification: 'PASS' });
  process.exit(0);
}
