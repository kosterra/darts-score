import { build } from 'esbuild';
import { cpSync } from 'fs';

await build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  outfile: 'dist/bundle.js',
  format: 'esm',
  // npm packages are installed next to the bundle (see the Dockerfile) instead
  // of being bundled: several are CommonJS and use require() or __dirname to
  // find their own files (e.g. the Swagger UI), which breaks inside one ES module
  packages: 'external',
});

// Copy public assets (favicon etc.) and OpenAPI spec alongside the bundle
cpSync('public', 'dist/public', { recursive: true });
cpSync('openapi.yaml', 'dist/openapi.yaml');

console.log('Build complete.');
