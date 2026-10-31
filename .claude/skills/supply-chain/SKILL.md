---
name: supply-chain
description: Harden and verify Legmate's software supply chain — GitHub Actions pinned to commit SHAs, Dependabot for Actions and npm, the Sigstore-signed release image with SBOM and provenance attestations, the digest-pinned base image, floating images in compose, install scripts, and how an operator verifies what they pull. Use whenever the user asks about pipeline or CI security, image signing, cosign, SBOM, provenance, Dependabot, pinning, a new GitHub Action, or a suspected supply-chain compromise.
---

# Supply chain for Legmate

Code reaches production through: npm packages → `Dockerfile` (base image by digest) →
GitHub Actions (`.github/workflows`) → Docker Hub `kosterra/darts-score` → the operator's
`docker compose pull`. Each hop has a control; this skill says which and how to check it.
Package policy itself (age over newness, slopsquatting checks, the PrimeReact hold) is in
the [`dependency-management`](../dependency-management/SKILL.md) skill.

## Actions: commit SHAs, not tags

Every `uses:` in `checks.yml`, `develop.yml`, `release.yml` is `owner/action@<sha> # vX.Y.Z`.
A tag can be moved by a compromised maintainer (tj-actions/changed-files, 2025); a SHA
cannot. Check: `grep -n "uses:" .github/workflows/*.yml` must show no `@v`. To add or bump
one, resolve the tag yourself:

```bash
repo=actions/checkout; tag=v7.0.1
ref=$(gh api repos/$repo/git/ref/tags/$tag --jq '.object.sha + " " + .object.type')
sha=${ref%% *}; [ "${ref##* }" = tag ] && sha=$(gh api repos/$repo/git/tags/$sha --jq .object.sha)
echo "$repo@$sha # $tag"
```

Only well-known publishers (`actions/`, `docker/`, `sigstore/`); `rickstaa/action-create-tag`
is the one third-party action and has `contents: write` — replace it with a plain
`git tag -f && git push -f origin <tag>` step if it ever worries you. Workflow permissions
are minimal: `contents: read` everywhere, `write` plus `id-token: write` only in the release.

## Dependabot

`.github/dependabot.yml`: weekly on Mondays, **cooldown 14 days** (a release must be two
weeks old before it is proposed — the policy's "age over newness"), one grouped PR per
project for minor+patch, majors ignored (bumped by hand, PrimeReact stays on 10). The
Docker ecosystem is deliberately absent: the base image is bumped by hand only for a
High/Critical. Review a Dependabot PR like any update: changelog, release date, then the
checks must be green. Security advisories still arrive as GitHub security alerts.

## The release image: signed, with SBOM and provenance

`release.yml` builds with `provenance: mode=max` and `sbom: true` (BuildKit attestations
in the image index), then signs keyless with cosign (the workflow's OIDC identity in the
Sigstore log) and attaches `sbom/darts-score-api.cdx.json` and `sbom/darts-score-ui.cdx.json`
as CycloneDX attestations. Verify a pulled image (the operator's side):

```bash
cosign verify \
  --certificate-identity-regexp '^https://github.com/kosterra/darts-score/\.github/workflows/release\.yml@refs/heads/main$' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  kosterra/darts-score:latest
cosign verify-attestation --type cyclonedx --certificate-identity-regexp '^https://github.com/kosterra/darts-score/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com kosterra/darts-score:latest \
  | jq -r .payload | base64 -d | jq '.predicate.components | length'
docker buildx imagetools inspect kosterra/darts-score:latest --format '{{ json .Provenance }}' | head -c 600
```

`:develop` (TEST stack) is not signed. **npm provenance** does not apply: nothing is
published to npm. Regenerate the SBOM/CBOM in `sbom/` with each release (see its README),
otherwise the attestation describes the previous version.

## Images that still float

`mongo:8.0` and `cloudflare/cloudflared:latest` in `docker-compose.yml` are not pinned:
operators get whatever those tags resolve to at `pull`. Acceptable for an official DB image
on a minor line; if the user wants reproducibility, pin by digest the way the Dockerfile
does (`docker buildx imagetools inspect <image:tag>` prints it) and bump deliberately.

## Install scripts

`npm ci` in the Dockerfile runs lifecycle scripts. `--ignore-scripts` was considered and
rejected: `esbuild` (the API bundler) needs its postinstall. Mitigation is the
lockfile plus the package checks in dependency-management; `npm view <pkg> scripts`
before adding anything, and `npm audit signatures` as a quick registry-signature check.

## Checklist for a pipeline review

1. `grep -n "uses:" .github/workflows/*.yml | grep -v "# v"` → empty.
2. `grep -n "permissions" -A2 .github/workflows/*.yml` → read-only unless needed.
3. `.github/dependabot.yml` present, cooldown ≥ 14 days, no majors.
4. `Dockerfile` `ARG NODE_IMAGE=node:<tag>@sha256:…` and the comment's date is recent.
5. The last release run has the cosign steps green; `cosign verify` of `:latest` passes.
6. `sbom/` regenerated for the release; `npm audit --omit=dev` clean in `app-api`.
7. Secrets in Actions: only `DOCKERHUB_USER`/`DOCKERHUB_PASSWORD` (a token with push
   rights to this repository only, rotated when a maintainer leaves).
