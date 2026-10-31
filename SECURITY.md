# Security policy

Legmate is open source and runs as separate installations, each with its own operator.
Thank you for looking at it closely — reports are welcome and taken seriously.

## Reporting a vulnerability

- **For the software itself** (anything in this repository): open a
  [private security advisory](https://github.com/kosterra/darts-score/security/advisories/new)
  on GitHub. Only the maintainer sees it. Please do not open a public issue for a
  security problem.
- **For a running installation** (for example legmate.ch): write to the operator named on
  that installation's *Imprint and privacy* page, or use its `/.well-known/security.txt`,
  which names the operator's address when one is set. legmate.ch is run by the maintainer,
  so either way reaches the same person.

Please include what you found, how to reproduce it, and what you think an attacker could
do with it. You will get an acknowledgement within seven days. A confirmed problem is fixed
in the next release (releases are frequent, see the tags) and mentioned in the release
notes; you are credited there if you wish.

## Scope

In scope: the API and the web app in this repository, the Docker image, the compose files
and the CI pipeline. Out of scope: the hosting, mail provider or Cloudflare of a given
installation (report those to the operator), and findings that need a compromised device or
browser of the victim.

Testing against **your own installation** or a local stack from this repository is always
fine. Testing against an installation you do not run needs the operator's permission; for
legmate.ch, ask first through the advisory form. No denial-of-service testing, no reading of
other people's data beyond what is needed to show the issue.

## Supported versions

Only the latest release (`:latest`, the newest tag) receives fixes. Installations pull a
newer image to upgrade; there are no backports.

## What is already in place

The [security notes](docs/security.md) describe the controls (sessions, two-step login,
passkeys, authorisation, uploads, headers, rate limits), the
[threat model](docs/threat-model.md) the trust boundaries, and the
[privacy review](docs/privacy-review.md) the handling of personal data. Dependencies and the
base image are kept current under a conservative policy; the release image is signed with
Sigstore and carries its SBOM (see [deployment](docs/deployment.md)).
