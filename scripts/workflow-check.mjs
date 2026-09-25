#!/usr/bin/env node
/* global console, process */

import {
  findSpec,
  statusFor,
  specStatus,
  milestones,
  loadConfig,
  currentBranch,
} from './workflow-lib.mjs';

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

const [command = 'status', specArg] = process.argv.slice(2);

if (command === 'ci') {
  const config = loadConfig();
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || currentBranch();
  let spec;
  try {
    spec = findSpec(specArg);
  } catch {
    if (!config.protectedBranches.includes(branch)) {
      fail(
        `Workflow CI blocked: no feature specification resolved for branch ${branch || '(detached)'}.`,
      );
    }
    console.log(
      `Workflow CI: no spec resolved for protected branch ${branch}; structural spec gate skipped.`,
    );
    process.exit(0);
  }
  if (specStatus(spec.text) !== 'LOCKED') fail(`Workflow CI blocked: ${spec.id} is not LOCKED.`);
  if (milestones(spec.text).length === 0)
    fail(`Workflow CI blocked: ${spec.id} contains no implementation milestones.`);
  console.log(`Workflow CI structural gate passed for ${spec.id}.`);
  process.exit(0);
}

let spec;
try {
  spec = findSpec(specArg);
} catch (e) {
  if (command === 'prepush' && !specArg) {
    const branch = currentBranch();
    const config = loadConfig();
    if (config.protectedBranches.includes(branch)) {
      fail(
        `Direct push blocked for protected branch ${branch}. Use the repository PR/release workflow.`,
      );
    }
    fail(`Feature workflow gate blocked: no SPEC ID detected on branch ${branch || '(detached)'}.`);
  }
  fail(e.message);
}
const state = statusFor(spec);

if (command === 'status') {
  console.log(`${spec.id} — ${spec.relativePath}`);
  console.log(`Spec status: ${state.status}`);
  console.log(`Readiness review: ${state.readiness ? 'PASS' : 'PENDING'}`);
  for (const m of state.milestones)
    console.log(`Milestone ${m.milestone} QA: ${m.pass ? 'PASS' : 'PENDING'}`);
  console.log(`Pre-push review: ${state.prepush ? 'PASS' : 'PENDING'}`);
  console.log(`NEXT ACTION: ${state.next}`);
  process.exit(0);
}

if (command === 'prepush') {
  if (state.next !== 'READY_TO_PUSH') {
    fail(
      [
        'PUSH BLOCKED — feature workflow is incomplete.',
        `Spec: ${spec.id}`,
        `Spec status: ${state.status}`,
        `Readiness: ${state.readiness ? 'PASS' : 'PENDING'}`,
        ...state.milestones.map(
          (m) => `Milestone ${m.milestone} QA: ${m.pass ? 'PASS' : 'PENDING'}`,
        ),
        `Pre-push: ${state.prepush ? 'PASS' : 'PENDING'}`,
        `Next required action: ${state.next}`,
      ].join('\n'),
    );
  }
  console.log(`Workflow gate passed: ${spec.id} is READY_TO_PUSH.`);
  process.exit(0);
}

fail(`Unknown command: ${command}`);
