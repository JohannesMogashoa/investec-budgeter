#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkgPath = 'package.json';
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts ??= {};
  const additions = {
    'workflow:status': 'node scripts/workflow-check.mjs status',
    'workflow:prepush': 'node scripts/workflow-check.mjs prepush',
    'workflow:ci': 'node scripts/workflow-check.mjs ci',
    'workflow:record': 'node scripts/workflow-record.mjs',
    'workflow:install': 'node scripts/install-feature-workflow.mjs'
  };
  for (const [k,v] of Object.entries(additions)) pkg.scripts[k] ??= v;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Updated package.json workflow scripts.');
} else {
  console.log('No package.json found; skipped npm script registration.');
}

const ignorePath = '.gitignore';
const required = ['.workflow/local/'];
let ignore = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
for (const line of required) if (!ignore.split(/\r?\n/).includes(line)) ignore += `${ignore.endsWith('\n') || !ignore ? '' : '\n'}${line}\n`;
fs.writeFileSync(ignorePath, ignore);

if (fs.existsSync('.git')) {
  const r = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  try { fs.chmodSync('.githooks/pre-push', 0o755); } catch {}
  console.log('Configured Git to use .githooks/.');
} else {
  console.log('Not currently inside a Git repository; run npm run workflow:install after copying these files into the repo.');
}

console.log('Feature workflow installation complete. Restart Codex so project hooks/configuration reload.');
