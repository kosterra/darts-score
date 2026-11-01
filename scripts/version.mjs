#!/usr/bin/env node
// The version of Legmate: {year}.{month}.{sequence}, the sequence counting from
// 0 in each month (2026.11.0, 2026.11.1, … then 2026.12.0). The month has no
// leading zero, so the version stays valid semver for npm and the image tags.
// It lives in the root package.json (`version`, which the release workflow
// tags and builds) and in app-api/openapi.yaml (`info.version`).
//
//   node scripts/version.mjs           # show the version and the next one
//   node scripts/version.mjs next      # write the next version into both files
//   node scripts/version.mjs 2026.11.0 # write this version (a correction)
//
// The next version after the current one: in the same month the sequence goes
// up by one, in a new month (or year) it starts at 0 again. See the
// versioning skill (.claude/skills/versioning) for when to bump.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = path.join(ROOT, 'package.json');
const OPENAPI = path.join(ROOT, 'app-api', 'openapi.yaml');
const FORMAT = /^(\d{4})\.([1-9]|1[0-2])\.(0|[1-9]\d*)$/;

export const nextVersion = (current, today = new Date()) => {
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const match = FORMAT.exec(current);
    if (match && Number(match[1]) === year && Number(match[2]) === month) return `${year}.${month}.${Number(match[3]) + 1}`;
    return `${year}.${month}.0`;
};

// a file replaced as a whole (a temp file renamed over it), as the dev servers watch the working copy
const writeAtomic = (file, text) => {
    const temp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(temp, text);
    fs.renameSync(temp, file);
};

const replaceOnce = (text, pattern, replacement, file) => {
    if (!pattern.test(text)) throw new Error(`no version found in ${path.relative(ROOT, file)}`);
    return text.replace(pattern, replacement);
};

const current = JSON.parse(fs.readFileSync(PACKAGE, 'utf8')).version;
const arg = process.argv[2];

if (!arg) {
    console.log(`version ${current}${FORMAT.test(current) ? '' : ' (not {year}.{month}.{sequence})'}, next ${nextVersion(current)}`);
    process.exit(0);
}

const version = arg === 'next' ? nextVersion(current) : arg;
if (!FORMAT.test(version)) {
    console.error(`${version} is not {year}.{month}.{sequence} (e.g. 2026.11.0, no leading zeros)`);
    process.exit(1);
}

writeAtomic(PACKAGE, replaceOnce(fs.readFileSync(PACKAGE, 'utf8'), /("version":\s*")[^"]*(")/, `$1${version}$2`, PACKAGE));
writeAtomic(OPENAPI, replaceOnce(fs.readFileSync(OPENAPI, 'utf8'), /^(  version: ).*$/m, `$1${version}`, OPENAPI));
console.log(`${current} → ${version}`);
