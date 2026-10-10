import { build } from 'esbuild';
import { cpSync } from 'fs';

await build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  outfile: 'dist/bundle.js',
  format: 'esm',
});

// Copy public assets (favicon etc.) and OpenAPI spec alongside the bundle
cpSync('public', 'dist/public', { recursive: true });
cpSync('openapi.yaml', 'dist/openapi.yaml');

console.log('Build complete.');
