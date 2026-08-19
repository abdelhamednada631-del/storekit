#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CTX="${TMPDIR:-/tmp}/storekit-railway-build-context"
RUNNER="${TMPDIR:-/tmp}/storekit-railway-runtime"
PORT_TO_TEST="${PORT_TO_TEST:-8093}"

if [[ ! -f "$CTX/artifacts/api-server/dist/index.mjs" ]]; then
  echo "Missing build context. Run verify_railway_build_context.sh first." >&2
  exit 1
fi

rm -rf "$RUNNER"
mkdir -p "$RUNNER" "$RUNNER/lib/db" "$RUNNER/lib/api-spec" "$RUNNER/lib/api-zod" "$RUNNER/lib/api-client-react" "$RUNNER/artifacts/api-server" "$RUNNER/scripts"

cp -a "$CTX/artifacts/api-server/dist" "$RUNNER/artifacts/api-server/dist"
cp -a "$CTX/artifacts/storekit/dist/public" "$RUNNER/public"
cp -a "$CTX/lib/db/drizzle" "$RUNNER/artifacts/api-server/drizzle"
cp "$ROOT/pnpm-workspace.yaml" "$ROOT/pnpm-lock.yaml" "$ROOT/package.json" "$ROOT/tsconfig.json" "$ROOT/tsconfig.base.json" "$RUNNER/"
for package in lib/db lib/api-spec lib/api-zod lib/api-client-react artifacts/api-server scripts; do
  cp "$ROOT/$package/package.json" "$RUNNER/$package/package.json"
done

cd "$RUNNER"
npx --yes pnpm@10 install --frozen-lockfile --prod

set -a
if [[ -f /tmp/storekit-runtime.env ]]; then
  . /tmp/storekit-runtime.env
fi
set +a
export NODE_ENV=production
export PORT="$PORT_TO_TEST"
export FRONTEND_DIST="$RUNNER/public"
export UPLOAD_DIR="$RUNNER/uploads"
mkdir -p "$RUNNER/uploads"

node --enable-source-maps ./artifacts/api-server/dist/index.mjs > "$RUNNER/server.log" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${PORT_TO_TEST}/healthz" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${PORT_TO_TEST}/healthz" | grep -qx 'ok'
curl -fsS "http://127.0.0.1:${PORT_TO_TEST}/api/health" | grep -q '"ok":true'
curl -fsS "http://127.0.0.1:${PORT_TO_TEST}/" | grep -q 'StoreKit'
curl -fsS "http://127.0.0.1:${PORT_TO_TEST}/collections" | grep -q 'StoreKit'
curl -fsS "http://127.0.0.1:${PORT_TO_TEST}/images/fashion/hero-luxury-mobile.jpg" -o /tmp/storekit-runtime-hero.jpg
test -s /tmp/storekit-runtime-hero.jpg
printf 'railway_runtime_image=passed\nport=%s\nrunner=%s\n' "$PORT_TO_TEST" "$RUNNER"
