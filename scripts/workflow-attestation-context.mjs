#!/usr/bin/env node
/* global process */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { buildManifest, canonicalJson } from './workflow-attestation.mjs';

function gh(args) {
  return execFileSync('gh', ['api', ...args], { encoding: 'utf8' });
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function event() {
  return JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
}

function reviews(repository, pullNumber) {
  const pages = JSON.parse(
    gh([`repos/${repository}/pulls/${pullNumber}/reviews`, '--paginate', '--slurp']),
  );
  return pages.flat();
}

function authorizedReviewer(repository, pullNumber) {
  const latest = new Map();
  for (const review of reviews(repository, pullNumber)) {
    if (review.user?.login) latest.set(review.user.login, review);
  }
  for (const review of latest.values()) {
    if (review.state !== 'APPROVED') continue;
    const permission = JSON.parse(
      gh([`repos/${repository}/collaborators/${encodeURIComponent(review.user.login)}/permission`]),
    );
    if (['admin', 'maintain'].includes(permission.permission)) return review.user.login;
  }
  throw new Error('No approved review from a repository maintainer is available.');
}

function specFor(headCommit, specId) {
  const paths = git(['ls-tree', '-r', '--name-only', headCommit, 'spec'])
    .split('\n')
    .filter((path) => path.endsWith('.md') && /spec\/SPEC-\d+-.*\.md$/i.test(path));
  const matches = paths.filter(
    (path) => !specId || path.toUpperCase().includes(`${specId.toUpperCase()}-`),
  );
  if (matches.length !== 1)
    throw new Error(`Expected one candidate spec at ${headCommit}; found ${matches.length}.`);
  const path = matches[0];
  return { path, text: git(['show', `${headCommit}:${path}`]) };
}

const payload = event();
const repository = process.env.GITHUB_REPOSITORY;
const pullNumber = payload.pull_request?.number;
const headCommit = payload.pull_request?.head?.sha;
const baseBranch = payload.pull_request?.base?.ref;
if (!repository || !pullNumber || !headCommit || !baseBranch)
  throw new Error('A pull-request event is required.');
if (payload.pull_request.head.repo.full_name !== repository)
  throw new Error('Fork pull requests cannot issue workflow attestations.');

const reviewer = authorizedReviewer(repository, pullNumber);
const spec = specFor(headCommit, process.env.WORKFLOW_SPEC_ID);
const manifest = buildManifest({
  repository,
  baseBranch,
  pullRequestNumber: pullNumber,
  headCommit,
  spec: {
    id: spec.path.match(/SPEC-\d+/i)[0].toUpperCase(),
    path: spec.path,
    sha256: (await import('node:crypto')).createHash('sha256').update(spec.text).digest('hex'),
  },
  evidence: [
    {
      type: 'readiness',
      milestone: null,
      verification: 'PASS',
      verificationCommand: 'npm run verify',
      verificationReference: `workflow-run:${process.env.GITHUB_RUN_ID}`,
      reviewer,
      authorization: 'required-maintainer-review',
      reviewedAt: new Date().toISOString(),
    },
  ],
  workflow: {
    name: 'Feature Workflow Attestation',
    file: '.github/workflows/feature-workflow-attestation.yml',
    runId: process.env.GITHUB_RUN_ID,
  },
  issuedAt: new Date().toISOString(),
});

const output = process.env.GITHUB_OUTPUT;
if (output) fs.appendFileSync(output, 'attestation=required\n');
fs.mkdirSync('.workflow/attestation', { recursive: true });
fs.writeFileSync('.workflow/attestation/manifest.json', canonicalJson(manifest));
