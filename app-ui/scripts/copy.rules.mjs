/* global console */
// Copies the shared rule files to the API (see src/rules/shared.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHARED_RULES } from '../src/rules/shared.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.join(here, '../src/rules');
const to = path.join(here, '../../app-api/src/rules');
fs.mkdirSync(to, { recursive: true });
for (const file of SHARED_RULES) fs.copyFileSync(path.join(from, file), path.join(to, file));
console.log(`Copied ${SHARED_RULES.length} rule files to ${to}`);
