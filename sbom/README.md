# Bill of Materials (SBOM + CBOM)

Generated on 2026-10-31 for release 2026.10.31 with `node scripts/sbom.mjs` (SBOMs) from the committed lockfiles; the CBOM is kept by hand.

## Dependency SBOMs (CycloneDX 1.5)

Production (runtime) dependencies of each component, from the committed
`package-lock.json` files — the scope matches the shipped Docker image
(`npm ci --omit=dev`), so dev/test tooling (vitest, vite, nodemon, eslint)
is excluded.

- `darts-score-api.cdx.json` — the API's runtime dependencies (159 components)
- `darts-score-ui.cdx.json` — the web app's bundled dependencies (120 components)

Each component carries its name, version, `pkg:npm` PURL, declared licence and
the lockfile integrity hash (SHA-512).

## Cryptography BOM (CycloneDX 1.6)

- `darts-score.cbom.json` — 19 cryptographic assets (algorithms, keys, protocols)
  read from the application source, each with OID, NIST quantum-security level,
  the source locations of its use and the asset→key dependency graph.

Regenerate after dependency or cryptography changes; keep in step with a release:
`node scripts/sbom.mjs` after `npm ci` in `app-api` and `app-ui`, and the CBOM edited where a
cryptographic use was added or moved.
