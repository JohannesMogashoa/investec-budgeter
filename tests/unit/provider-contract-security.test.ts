// The repository intentionally does not depend on @types/node; these test-only imports are runtime Node APIs.
declare const process: { cwd(): string };

// @ts-expect-error Node runtime module without bundled type declarations.
import { execFileSync } from 'node:child_process';
// @ts-expect-error Node runtime module without bundled type declarations.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contractPath = 'docs/sa-pb-account-information.json';
const identifierKeys = new Set(['accountId', 'accountNumber', 'profileId']);

function collectIdentifiers(node: unknown, result = new Set<string>()) {
  if (!node || typeof node !== 'object') return result;
  for (const [key, value] of Object.entries(node)) {
    if (identifierKeys.has(key) && typeof value === 'string') result.add(value);
    collectIdentifiers(value, result);
  }
  return result;
}

describe('provider contract examples', () => {
  it('contains no identifier values from the pre-sanitization contract revision', () => {
    const latestCommit = execFileSync('git', ['log', '-1', '--format=%H', '--', contractPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    const original = JSON.parse(
      execFileSync('git', ['show', `${latestCommit}^:${contractPath}`], {
        cwd: process.cwd(),
        encoding: 'utf8',
      }),
    );
    const sanitizedText = readFileSync(contractPath, 'utf8');

    for (const identifier of collectIdentifiers(original))
      expect(sanitizedText).not.toContain(identifier);
    expect(sanitizedText).toContain('example-account-id');
    expect(sanitizedText).toContain('example-profile-id');
    expect(sanitizedText).toContain('0000000000');
  });
});
