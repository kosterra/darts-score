#!/usr/bin/env bash
# The screenshots of the public start page (app-ui/public/showcase), made from
# a demo club played through the app itself: an API on a throwaway database
# (oche_showcase, dropped at the end) and the UI for it.
#
# Needs the dev containers running (docker compose -f docker-compose.dev.yml up)
# for their MongoDB and the darts-score-api image, and Playwright with Chromium
# (npm i playwright && npx playwright install chromium; PLAYWRIGHT may point
# to the module when it lives elsewhere). Takes about three quarters of an hour.
#
#   scripts/showcase/run.sh
#
# OUT=<dir> writes the pictures elsewhere, e.g. for a trial run. KEEP_DB=1 keeps
# the demo database afterwards; SHOOT_ONLY=1 then only takes
# the pictures again, from the games played before.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
API_PORT=3902
UI_PORT=5198
DB=oche_showcase
MONGO=darts-score-mongo-1
OUT="${OUT:-$ROOT/app-ui/public/showcase}"

mongo() {
    docker exec -i "$MONGO" sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet '"$DB"
}

cleanup() {
    docker rm -f oche-showcase-api >/dev/null 2>&1 || true
    # npx starts vite as a child of its own: it goes by its port
    kill $(ss -ltnpH "sport = :$UI_PORT" | grep -oP 'pid=\K\d+') 2>/dev/null || true
    [ -n "${KEEP_DB:-}" ] || echo 'db.dropDatabase()' | mongo >/dev/null || true
    [ -n "${UI_DIST:-}" ] && rm -rf "$UI_DIST"
}
trap cleanup EXIT

[ -n "${SHOOT_ONLY:-}" ] || echo 'db.dropDatabase()' | mongo >/dev/null
docker run -d --rm --name oche-showcase-api --network darts-score_default -p "$API_PORT:3001" \
    -v "$ROOT/app-api":/work:ro -w /work --env-file "$ROOT/.env" \
    -e DB_HOST=mongo -e DB_NAME="$DB" -e IMG_DIR=/tmp/img -e NODE_ENV=development -e APP_URL="http://localhost:$UI_PORT" \
    darts-score-api node index.js >/dev/null
# a build of its own: changing the code meanwhile does not reach the pages being played
UI_DIST="$(mktemp -d)"
(cd "$ROOT/app-ui" && npx vite build --outDir "$UI_DIST" --emptyOutDir >/dev/null)
(cd "$ROOT/app-ui" && API_PROXY_TARGET="http://localhost:$API_PORT" npx vite preview --outDir "$UI_DIST" --port "$UI_PORT" --strictPort >/dev/null 2>&1) &
until curl -sf "http://localhost:$API_PORT/api/health" >/dev/null && curl -sf "http://localhost:$UI_PORT" >/dev/null; do sleep 1; done

cd "$ROOT/scripts/showcase"
if [ -z "${SHOOT_ONLY:-}" ]; then
    node make.mjs play "http://localhost:$UI_PORT"
    mongo < spread.js >/dev/null
fi
mkdir -p "$OUT"
node make.mjs shoot "http://localhost:$UI_PORT" "$OUT"
