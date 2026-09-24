/* global URL, console */

import { readFile } from 'node:fs/promises';

const bundle = await readFile(new URL('../dist/Code.js', import.meta.url), 'utf8');
const credentialUi = await readFile(new URL('../dist/credentials.html', import.meta.url), 'utf8');
const requiredHandlers = [
  'onOpen',
  'setupWorkbookSheets',
  'testConnection',
  'syncAccounts',
  'syncBalances',
  'syncTransactions',
  'configureCredentials',
  'saveCredentials',
  'clearCredentials',
  'clearCachedAccessToken',
];
const forbiddenPatterns = [
  /\brequire\s*\(/,
  /\bprocess\./,
  /\bBuffer\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bimport\.meta\b/,
  /\bnode:/,
];

for (const handler of requiredHandlers) {
  if (!bundle.includes(handler)) {
    throw new Error(`Bundle is missing Apps Script handler: ${handler}`);
  }
  if (!new RegExp(`function ${handler}\\s*\\(`).test(bundle)) {
    throw new Error(`Bundle does not expose Apps Script handler globally: ${handler}`);
  }
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(bundle)) {
    throw new Error(`Bundle contains a Node-only API: ${pattern}`);
  }
}

console.log(`Validated Apps Script bundle (${bundle.length} bytes).`);

if (!credentialUi.includes('google.script.run') || credentialUi.includes('ALLOWALL')) {
  throw new Error('Credential UI is missing server-side calls or weakens iframe protection.');
}

console.log(`Validated credential UI (${credentialUi.length} bytes).`);
