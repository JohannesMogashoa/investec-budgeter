// The repository intentionally does not depend on @types/node; these test-only imports are runtime Node APIs.
declare const process: { env: Record<string, string | undefined> };

// @ts-expect-error Node runtime module without bundled type declarations.
import { execFileSync } from 'node:child_process';
// @ts-expect-error Node runtime module without bundled type declarations.
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
// @ts-expect-error Node runtime module without bundled type declarations.
import { tmpdir } from 'node:os';
// @ts-expect-error Node runtime module without bundled type declarations.
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];

function createFixture(branch = 'feat/spec-01-workflow') {
  const directory = mkdtempSync(join(tmpdir(), 'investec-workflow-test-'));
  fixtures.push(directory);
  mkdirSync(join(directory, '.workflow'), { recursive: true });
  mkdirSync(join(directory, 'scripts'), { recursive: true });
  cpSync('scripts/workflow-lib.mjs', join(directory, 'scripts/workflow-lib.mjs'));
  cpSync('scripts/workflow-check.mjs', join(directory, 'scripts/workflow-check.mjs'));
  cpSync('scripts/workflow-attestation.mjs', join(directory, 'scripts/workflow-attestation.mjs'));
  writeFileSync(
    join(directory, '.workflow/config.json'),
    JSON.stringify({
      specDirectory: 'spec',
      evidenceDirectory: '.workflow/local',
      defaultBaseBranch: 'development',
      protectedBranches: ['development', 'staging', 'master'],
      verifyCommand: 'node -e "process.exit(0)"',
    }),
  );
  mkdirSync(join(directory, 'spec'), { recursive: true });
  writeFileSync(
    join(directory, 'spec/SPEC-01-workflow.md'),
    '# Fixture\n\n- **Status:** `LOCKED`\n\n### Milestone 1: First\n\n### Milestone 2: Second\n',
  );
  writeFileSync(join(directory, '.gitignore'), '.workflow/local/\n');
  execFileSync('git', ['init', '-q', '-b', branch], { cwd: directory });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: directory });
  execFileSync('git', ['config', 'user.name', 'Workflow Test'], { cwd: directory });
  execFileSync('git', ['add', '.'], { cwd: directory });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: directory });
  return directory;
}

function run(directory: string, args: string[], env = {}) {
  try {
    return {
      status: 0,
      output: execFileSync('node', ['scripts/workflow-check.mjs', ...args], {
        cwd: directory,
        env: { ...process.env, ...env },
        encoding: 'utf8',
      }),
    };
  } catch (error) {
    const result = error as { status?: number; stdout?: string; stderr?: string };
    return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  }
}

afterEach(() => {
  for (const directory of fixtures.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('feature workflow gates', () => {
  it('rejects forged milestone evidence with the wrong evidence type', () => {
    const directory = createFixture();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: directory,
      encoding: 'utf8',
    }).trim();
    const specPath = 'spec/SPEC-01-workflow.md';
    const specHash = execFileSync('sha256sum', [specPath], {
      cwd: directory,
      encoding: 'utf8',
    }).split(' ')[0];
    const evidence = {
      schemaVersion: 1,
      type: 'prepush',
      specId: 'SPEC-01',
      specPath,
      specHash,
      verdict: 'PASS',
      reviewedCommit: head,
      verification: 'PASS',
    };
    mkdirSync(join(directory, '.workflow/local/SPEC-01'), { recursive: true });
    writeFileSync(
      join(directory, '.workflow/local/SPEC-01/readiness.json'),
      JSON.stringify({ ...evidence, type: 'readiness' }),
    );
    writeFileSync(
      join(directory, '.workflow/local/SPEC-01/milestone-1.json'),
      JSON.stringify(evidence),
    );
    writeFileSync(
      join(directory, '.workflow/local/SPEC-01/milestone-2.json'),
      JSON.stringify(evidence),
    );

    const result = run(directory, ['status', 'SPEC-01']);

    expect(result.status).toBe(0);
    expect(result.output).toContain('Milestone 1 QA: PENDING');
    expect(result.output).toContain('Milestone 2 QA: PENDING');
  });

  it('blocks CI and pre-push checks on a feature branch without a spec', () => {
    const directory = createFixture('feature/no-spec');

    const ci = run(directory, ['ci'], { GITHUB_HEAD_REF: 'feature/no-spec' });
    const prepush = run(directory, ['prepush']);

    expect(ci.status).not.toBe(0);
    expect(ci.output).toContain('no feature specification resolved');
    expect(prepush.status).not.toBe(0);
    expect(prepush.output).toContain('no SPEC ID detected');
  });

  it('allows only the documented first push before a remote attestation exists', () => {
    const directory = createFixture();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: directory,
      encoding: 'utf8',
    }).trim();
    const specPath = 'spec/SPEC-01-workflow.md';
    const specHash = execFileSync('sha256sum', [specPath], {
      cwd: directory,
      encoding: 'utf8',
    }).split(' ')[0];
    mkdirSync(join(directory, '.workflow/local/SPEC-01'), { recursive: true });
    writeFileSync(
      join(directory, '.workflow/local/SPEC-01/readiness.json'),
      JSON.stringify({
        schemaVersion: 1,
        type: 'readiness',
        specId: 'SPEC-01',
        specPath,
        specHash,
        verdict: 'PASS',
        reviewedCommit: head,
      }),
    );

    const result = run(directory, ['prepush']);

    expect(result.status).toBe(0);
    expect(result.output).toContain('FIRST PUSH ALLOWED');
    expect(result.output).toContain('merge or deployment');
  });
});
