/* global URL, console */

import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const outputDirectory = new URL('../dist/', import.meta.url);

await mkdir(outputDirectory, { recursive: true });

await build({
  bundle: true,
  entryPoints: ['src/entrypoints/appsScript.ts'],
  format: 'iife',
  outfile: fileURLToPath(new URL('Code.js', outputDirectory)),
  platform: 'browser',
  target: 'es2019',
  legalComments: 'none',
  logLevel: 'info',
});

await copyFile('appsscript.json', new URL('appsscript.json', outputDirectory));

console.log('Built Apps Script bundle in dist/.');
