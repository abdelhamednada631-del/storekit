#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CTX="${TMPDIR:-/tmp}/storekit-railway-build-context"
rm -rf "$CTX"
mkdir -p "$CTX"

copy_manifest() {
  local path="$1"
  mkdir -p "$CTX/$(dirname "$path")"
  cp "$ROOT/$path" "$CTX/$path"
}

copy_manifest "pnpm-workspace.yaml"
copy_manifest "pnpm-lock.yaml"
copy_manifest "package.json"
copy_manifest "tsconfig.json"
copy_manifest "tsconfig.base.json"
for package in \
  lib/db \
  lib/api-spec \
  lib/api-zod \
  lib/api-client-react \
  artifacts/api-server \
  artifacts/storekit \
  scripts; do
  copy_manifest "$package/package.json"
done

cd "$CTX"
if [[ "${USE_PNPM10:-0}" == "1" ]]; then
  PNPM=(npx --yes pnpm@10)
else
  PNPM=(pnpm)
fi
"${PNPM[@]}" install --frozen-lockfile

# Frontend builder stage contents.
cp -a "$ROOT/lib/." "$CTX/lib/"
cp -a "$ROOT/artifacts/storekit/." "$CTX/artifacts/storekit/"
"${PNPM[@]}" --filter @workspace/storekit build

# API builder stage contents.
rm -rf "$CTX/artifacts/api-server" "$CTX/scripts"
cp -a "$ROOT/artifacts/api-server/." "$CTX/artifacts/api-server/"
cp -a "$ROOT/scripts/." "$CTX/scripts/"
"${PNPM[@]}" --filter @workspace/api-server run build

# Verify the runtime inputs that Dockerfile copies into the final image.
test -f "$CTX/artifacts/api-server/dist/index.mjs"
test -f "$CTX/artifacts/storekit/dist/public/index.html"
test -f "$CTX/tsconfig.base.json"
test -d "$CTX/lib/db/drizzle"
printf 'railway_build_context=passed\nfrontend_dist=%s\napi_dist=%s\n' \
  "$CTX/artifacts/storekit/dist/public" \
  "$CTX/artifacts/api-server/dist/index.mjs"
