import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SHARED_RULES } from './shared.js';

// the API next to the app: in the repository, or as the UI container mounts it
const api = [path.join(import.meta.dirname, '../../../app-api/src/rules'), '/repo/app-api/src/rules'].find(dir => fs.existsSync(dir));

describe('the rules the API keeps a copy of', () => {
    it.skipIf(!api)('are the same as here (npm run copy-rules)', () => {
        for (const file of SHARED_RULES) {
            expect(fs.readFileSync(path.join(api, file), 'utf8'), file).toBe(fs.readFileSync(path.join(import.meta.dirname, file), 'utf8'));
        }
    });
});
