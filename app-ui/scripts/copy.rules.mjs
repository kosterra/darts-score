/* global console */
// Copies the shared rule files to the API (see src/rules/shared.js), with the
// translations of the API's own texts (see src/locales/server.texts.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHARED_RULES } from '../src/rules/shared.js';
import { serverTexts } from '../src/locales/server.texts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.join(here, '../src/rules');
const to = path.join(here, '../../app-api/src/rules');
fs.mkdirSync(to, { recursive: true });
for (const file of SHARED_RULES) fs.copyFileSync(path.join(from, file), path.join(to, file));
console.log(`Copied ${SHARED_RULES.length} rule files to ${to}`);

const locales = path.join(here, '../../app-api/src/locales');
fs.mkdirSync(locales, { recursive: true });
fs.writeFileSync(path.join(locales, 'server.texts.json'), `${JSON.stringify(serverTexts(), null, 1)}\n`);
console.log(`Wrote the translations of the API's texts to ${locales}`);
