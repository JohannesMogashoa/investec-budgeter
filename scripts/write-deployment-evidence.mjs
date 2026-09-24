/* global process, console */

import { readFile, writeFile } from 'node:fs/promises';

const schemaSource = await readFile('src/sheets/schemaManifest.ts', 'utf8');
const schemaVersion = schemaSource.match(/WORKBOOK_SCHEMA_VERSION = '([^']+)'/)?.[1];
if (!schemaVersion) throw new Error('Could not determine workbook schema version.');

const commit = process.env.GITHUB_SHA ?? 'local';
const reason = process.env.DEPLOY_REASON ?? 'not specified';
await writeFile(
  'staging-deployment-evidence.txt',
  `commit=${commit}\nschemaVersion=${schemaVersion}\nreason=${reason}\n`,
  'utf8',
);

console.log(`Wrote staging deployment evidence for schema ${schemaVersion}.`);
