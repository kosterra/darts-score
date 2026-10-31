# Bill of Materials (SBOM + CBOM)

Generated on 2026-10-30 for build develop · 2026.10.23.

## Dependency SBOMs (CycloneDX 1.5)

Production (runtime) dependencies of each component, from the committed
`package-lock.json` files — the scope matches the shipped Docker image
(`npm ci --omit=dev`), so dev/test tooling (vitest, vite, nodemon, eslint)
is excluded.

- `darts-score-api.cdx.json` — the API's runtime dependencies (161 components)
- `darts-score-ui.cdx.json` — the web app's bundled dependencies (116 components)

Each component carries its name, version, `pkg:npm` PURL, declared licence and
the lockfile integrity hash (SHA-512).

## Cryptography BOM (CycloneDX 1.6)

- `darts-score.cbom.json` — 17 cryptographic assets (algorithms, keys, protocols)
  read from the application source, each with OID, NIST quantum-security level,
  the source locations of its use and the asset→key dependency graph.

Regenerate after dependency or cryptography changes; keep in step with a release.
