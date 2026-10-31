---
name: backup-restore
description: Prove and maintain Legmate's backup and restore path — the backup file format, the integration-test drill that backs up, wrecks and restores an in-memory installation, the operator's restore steps, encryption at rest and off-host copies, and what to extend when a collection or file kind is added. Use whenever the user asks about backups, restore, disaster recovery, data loss, encryption at rest, or changes src/utils/backups.js, the backup routes or adds a collection.
---

# Backup and restore for Legmate

A backup is one gzipped file of JSON lines (`legmate-YYYYMMDD-HHMMSS-<kind>.json.gz`,
kinds `manual|auto|before-restore|upload`) holding every collection except `sessions`,
plus the uploaded pictures as base64 (`app-api/src/utils/backups.js`,
`controllers/backup.controller.js`, routes under `/api/admin/backups`). Restore replaces
the collections named in the file, writes the pictures back to `IMG_DIR`, leaves logins
alone, and first writes a `before-restore` backup. In production the process exits after
a restore and compose restarts it.

## The drill (run it, do not reason about it)

`app-api/test/integration/backup.restore.integration.test.js` — 16 tests against an
in-memory MongoDB and temp `BACKUP_DIR`/`IMG_DIR`, never the dev database:

```bash
cd app-api
npm run test:integration                                   # drill + cross-club, ~10 s
npx vitest run --config vitest.integration.config.js test/integration/backup.restore.integration.test.js
```

It proves: file name and gzip magic, header `legmate-backup v1`, sessions absent, every
seeded collection and the picture bytes inside; wreck (delete game and player, rename
club, remove picture, add player) then restore → every collection deep-equals the
snapshot, picture identical, `before-restore` written, sessions untouched, cookies still
valid; download → upload → restore round trip; refusals (corrupt gzip, wrong header, bad
names, missing file, no `confirm: 'RESTORE'`) change nothing; same-second names do not
collide. Found on 2026-10-31 and fixed: a missing file hung the request and raised an
uncaught exception (now 422), and two backups in one second overwrote each other (names
now bump until free).

Known, documented behaviour: a file naming an unknown collection restores it (that is
what lets a newer backup restore); rejecting it would need a whitelist — a design choice.

## Extend the drill when

- a new collection or model appears → seed one document through the API before the
  `manual backup` step (the snapshot comparison covers it automatically);
- a new file kind is stored (not only `players/` pictures) → add a file and assert its
  bytes after restore;
- the header version changes → add a refusal/acceptance case for the old one.

Integration files share one mongoose singleton: `test/integration/setup.models.js`
clears the model registry before each file (else `OverwriteModelError`).

## Operator steps (Administration → Backups, global admin)

1. Optionally "Backup" first; the restore makes a `before-restore` anyway.
2. A file from elsewhere: "Upload" (appears as kind `upload`).
3. "Restore" on the row, type `RESTORE`, confirm. ~1.5 s later the API restarts
   (`restart: unless-stopped`); reload. Nobody is logged out.
4. Check a club, a game and a picture; the `before-restore` file is the way back.
Database-level alternative (`mongodump --archive --gzip` / `mongorestore`) is in
`docs/operations.md`; it does not include the pictures.

## Encryption and copies

Neither MongoDB Community nor the app encrypts the volume or the files. Tell the
operator: LUKS/dm-crypt under `/var/lib/docker/volumes` (or the bind-mounted data folder);
encrypt before copying off the server (`age -r <recipient> file > file.age`, or `gpg -e`),
key kept off the server, decrypt one periodically; schedule backups (keep 7 by default,
1–60) and copy them off-host — a volume that dies takes the backups with it. A downloaded
backup equals the database: password hashes, emails, encrypted MFA secrets (need
`MFA_KEY`), pictures. Deletions made after a backup are undone by its restore: replay
account deletions afterwards (see the privacy review).
