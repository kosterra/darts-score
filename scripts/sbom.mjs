#!/usr/bin/env node
// Writes the dependency SBOMs under sbom/ (CycloneDX 1.5) from the committed
// package-lock.json files: the production dependencies of the API and the web
// app, the scope of the shipped image (npm ci --omit=dev).
//
//   node scripts/sbom.mjs            # after npm ci in app-api and app-ui
//
// Each component carries name, version, pkg:npm PURL, licence, the lockfile's
// SHA-512 integrity hash and the registry tarball. The application version is
// the root package.json version. Run it with every release and after
// dependency updates; the release workflow attests these files to the image.
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const { version: appVersion } = readJson(path.join(ROOT, 'package.json'));

const SPDX_IDS = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'CC-BY-4.0', 'CC-BY-3.0',
    'MPL-2.0', 'BlueOak-1.0.0', 'Python-2.0', 'Zlib', 'WTFPL', 'MIT-0', 'LGPL-3.0-or-later', 'GPL-3.0-or-later', 'Artistic-2.0', 'AFL-2.1', 'BSD-3-Clause-Clear', 'PSF-2.0']);

// a lockfile licence string as a CycloneDX licence entry: an SPDX id, an expression, or a free name
const licenseOf = (license) => {
    if (!license) return undefined;
    const text = typeof license === 'string' ? license : license.type;
    if (!text) return undefined;
    if (/\b(AND|OR|WITH)\b/.test(text)) return [{ expression: text.replace(/^\(|\)$/g, '') }];
    return [{ license: SPDX_IDS.has(text) ? { id: text } : { name: text } }];
};

// the licence of a package that declares none, read from its LICENSE text
const licenseFileOf = (dir) => {
    const file = fs.existsSync(dir) && fs.readdirSync(dir).find(name => /^(LICENSE|LICENCE)(\.(md|txt))?$/i.test(name));
    if (!file) return undefined;
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    if (/Permission is hereby granted, free of charge/.test(text)) return 'MIT';
    if (/Permission to use, copy, modify, and\/or distribute/.test(text)) return 'ISC';
    return undefined;
};

const nameOf = (lockPath) => lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
const purlOf = (name, version) => `pkg:npm/${name.replace('/', '%2F')}@${version}`;
const hashOf = (integrity) => {
    const [alg, content] = integrity.split('-');
    const algs = { sha512: 'SHA-512', sha256: 'SHA-256', sha1: 'SHA-1' };
    return algs[alg] ? [{ alg: algs[alg], content: Buffer.from(content, 'base64').toString('hex') }] : undefined;
};

const componentsOf = (dir, lock) => {
    const seen = new Map();
    for (const [lockPath, entry] of Object.entries(lock.packages)) {
        if (!lockPath || entry.dev || entry.link) continue;
        const name = entry.name ?? nameOf(lockPath);
        const purl = purlOf(name, entry.version);
        if (seen.has(purl)) continue;
        // older lock entries carry no licence; the installed package.json or its LICENSE file has it
        let license = entry.license;
        if (!license) {
            const installed = path.join(dir, lockPath, 'package.json');
            if (fs.existsSync(installed)) license = readJson(installed).license;
            if (!license) license = licenseFileOf(path.join(dir, lockPath));
        }
        const slash = name.indexOf('/');
        const component = {
            type: 'library',
            'bom-ref': purl,
            name: slash > 0 ? name.slice(slash + 1) : name,
            version: entry.version,
            purl,
            ...(slash > 0 ? { group: name.slice(0, slash) } : {}),
            ...(licenseOf(license) ? { licenses: licenseOf(license) } : {}),
            ...(entry.integrity && hashOf(entry.integrity) ? { hashes: hashOf(entry.integrity) } : {}),
            ...(entry.resolved ? { externalReferences: [{ type: 'distribution', url: entry.resolved }] } : {}),
        };
        seen.set(purl, component);
    }
    return [...seen.values()].sort((a, b) => a['bom-ref'].localeCompare(b['bom-ref']));
};

const bomOf = (folder) => {
    const dir = path.join(ROOT, folder);
    const pkg = readJson(path.join(dir, 'package.json'));
    const components = componentsOf(dir, readJson(path.join(dir, 'package-lock.json')));
    return {
        name: pkg.name,
        bom: {
            bomFormat: 'CycloneDX',
            specVersion: '1.5',
            serialNumber: `urn:uuid:${randomUUID()}`,
            version: 1,
            metadata: {
                timestamp: new Date().toISOString(),
                tools: [{ vendor: 'Legmate security review', name: 'lockfile-sbom', version: '1.1' }],
                component: { type: 'application', 'bom-ref': `${pkg.name}@${pkg.version}`, name: pkg.name, version: appVersion, purl: purlOf(pkg.name, pkg.version) },
                properties: [{ name: 'cdx:scope', value: 'production (runtime) dependencies only' }],
            },
            components,
        },
    };
};

for (const folder of ['app-api', 'app-ui']) {
    const { name, bom } = bomOf(folder);
    const file = path.join(ROOT, 'sbom', `${name}.cdx.json`);
    fs.writeFileSync(file, `${JSON.stringify(bom, null, 2)}\n`);
    console.log(`${path.relative(ROOT, file)}: ${bom.components.length} components (${appVersion})`);
}
