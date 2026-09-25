/* global process */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { verifyAttestation } from './workflow-attestation.mjs';

export const root = process.cwd();

export function loadConfig() {
  const p = path.join(root, '.workflow', 'config.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function currentBranch() {
  try {
    return git(['branch', '--show-current']);
  } catch {
    return '';
  }
}

export function headCommit() {
  return git(['rev-parse', 'HEAD']);
}

export function isClean() {
  return git(['status', '--porcelain', '--untracked-files=normal']) === '';
}

export function isBootstrapPush() {
  const branch = currentBranch();
  if (!branch || loadConfig().protectedBranches.includes(branch)) return false;
  try {
    git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    return false;
  } catch {
    try {
      return git(['ls-remote', 'origin', `refs/heads/${branch}`]) === '';
    } catch {
      return true;
    }
  }
}

export function normalizeSpecId(value = '') {
  const m = String(value).match(/(?:SPEC[-_ ]?)?(\d+)/i);
  return m ? `SPEC-${String(Number(m[1])).padStart(2, '0')}` : null;
}

export function specIdFromBranch(branch = currentBranch()) {
  const m = branch.match(/spec[-_/]?(\d+)/i);
  return m ? normalizeSpecId(m[1]) : null;
}

export function findSpec(explicit) {
  const config = loadConfig();
  const id = normalizeSpecId(explicit) || specIdFromBranch();
  if (!id)
    throw new Error(
      'Unable to determine SPEC ID. Pass SPEC-XX explicitly or use a branch containing spec-XX.',
    );
  const dir = path.join(root, config.specDirectory);
  const prefix = `${id}-`;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toUpperCase().startsWith(prefix.toUpperCase()) && f.endsWith('.md'));
  if (files.length !== 1)
    throw new Error(`Expected exactly one active spec for ${id}; found ${files.length}.`);
  const specPath = path.join(dir, files[0]);
  const text = fs.readFileSync(specPath, 'utf8');
  return { id, specPath, relativePath: path.relative(root, specPath), text };
}

export function specHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function specStatus(text) {
  const m = text.match(/\*\*Status:\*\*\s*`?(DRAFT|REVIEW|LOCKED)`?/i);
  return m ? m[1].toUpperCase() : 'UNKNOWN';
}

export function milestones(text) {
  const found = new Set();
  for (const m of text.matchAll(/^###\s+.*?Milestone\s+(\d+)\b/gim)) found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
}

export function evidenceDir(specId) {
  const config = loadConfig();
  return path.join(root, config.evidenceDirectory, specId);
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function evidenceFile(specId, type, milestone) {
  const dir = evidenceDir(specId);
  if (type === 'milestone') return path.join(dir, `milestone-${milestone}.json`);
  return path.join(dir, `${type}.json`);
}

export function commitIsAncestor(commit, head = headCommit()) {
  const r = spawnSync('git', ['merge-base', '--is-ancestor', commit, head], { cwd: root });
  return r.status === 0;
}

export function validReadiness(spec) {
  const e = readJson(evidenceFile(spec.id, 'readiness'));
  return Boolean(
    e &&
    e.schemaVersion === 1 &&
    e.type === 'readiness' &&
    e.specId === spec.id &&
    e.specPath === spec.relativePath &&
    e.verdict === 'PASS' &&
    e.specHash === specHash(spec.text) &&
    e.reviewedCommit &&
    commitIsAncestor(e.reviewedCommit),
  );
}

export function validMilestone(spec, n) {
  const e = readJson(evidenceFile(spec.id, 'milestone', n));
  return Boolean(
    e &&
    e.schemaVersion === 1 &&
    e.type === 'milestone' &&
    e.specId === spec.id &&
    e.specPath === spec.relativePath &&
    e.milestone === n &&
    e.verdict === 'PASS' &&
    e.verification === 'PASS' &&
    e.specHash === specHash(spec.text) &&
    e.reviewedCommit &&
    commitIsAncestor(e.reviewedCommit),
  );
}

export function validPrepush(spec) {
  const e = readJson(evidenceFile(spec.id, 'prepush'));
  return Boolean(
    e &&
    e.schemaVersion === 1 &&
    e.type === 'prepush' &&
    e.specId === spec.id &&
    e.specPath === spec.relativePath &&
    e.verdict === 'PASS' &&
    e.verification === 'PASS' &&
    e.specHash === specHash(spec.text) &&
    e.reviewedCommit === headCommit() &&
    isClean(),
  );
}

export function validTrustedAttestation(spec) {
  const config = loadConfig();
  const attestation = config.attestation;
  const subjectPath = process.env.WORKFLOW_ATTESTATION_SUBJECT || attestation?.subjectPath;
  const repository = process.env.GITHUB_REPOSITORY || attestation?.repository;
  const signerWorkflow = attestation?.signerWorkflow;
  if (!subjectPath || !repository || !signerWorkflow || !fs.existsSync(subjectPath)) return false;
  try {
    const result = verifyAttestation({ subjectPath, repository, signerWorkflow });
    const manifest = JSON.parse(fs.readFileSync(subjectPath, 'utf8'));
    return (
      result &&
      manifest.repository === repository &&
      manifest.spec?.id === spec.id &&
      manifest.spec?.path === spec.relativePath &&
      manifest.spec?.sha256 === specHash(spec.text) &&
      manifest.headCommit === headCommit()
    );
  } catch {
    return false;
  }
}

export function runVerify() {
  const config = loadConfig();
  const result = spawnSync(config.verifyCommand, { cwd: root, shell: true, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Verification failed: ${config.verifyCommand}`);
}

export function statusFor(spec) {
  const status = specStatus(spec.text);
  const ms = milestones(spec.text);
  const readiness = validReadiness(spec);
  const milestoneStatus = ms.map((n) => ({ milestone: n, pass: validMilestone(spec, n) }));
  const allMilestones = ms.length > 0 && milestoneStatus.every((x) => x.pass);
  const trustedAttestation = validTrustedAttestation(spec);
  const prepush = allMilestones && validPrepush(spec) && trustedAttestation;

  let next;
  if (status !== 'LOCKED') next = 'REFINE_SPEC';
  else if (!readiness) next = 'SPEC_READINESS_REVIEW';
  else {
    const pending = milestoneStatus.find((x) => !x.pass);
    if (pending) next = `MILESTONE_${pending.milestone}_IMPLEMENT_OR_REVIEW`;
    else if (isBootstrapPush()) next = 'FIRST_PUSH_BOOTSTRAP_ALLOWED';
    else if (!trustedAttestation) next = 'TRUSTED_ATTESTATION_VERIFY';
    else if (!prepush) next = 'PRE_PUSH_REVIEW';
    else next = 'READY_TO_PUSH';
  }
  return { status, milestones: milestoneStatus, readiness, trustedAttestation, prepush, next };
}
