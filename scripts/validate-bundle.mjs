/* global URL, console */

import { readFile } from 'node:fs/promises';

const bundle = await readFile(new URL('../dist/Code.js', import.meta.url), 'utf8');
const requiredHandlers = [
  'onOpen',
  'testConnection',
  'syncAccounts',
  'syncBalances',
  'syncTransactions',
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
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(bundle)) {
    throw new Error(`Bundle contains a Node-only API: ${pattern}`);
  }
}

console.log(`Validated Apps Script bundle (${bundle.length} bytes).`);
