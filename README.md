# StoreKit

Luxury fashion storefront with a quiet-luxury React storefront and Express API served from one production Railway service.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/github?repo=abbn7/storekit-production-ready)

## One-click deployment

Click the **Deploy on Railway** button above, choose the repository if Railway asks, and deploy from the repository root. The repository includes `Dockerfile`, `railway.json`, and `nixpacks.toml`, so Railway builds one StoreKit service, starts the self-contained production entrypoint, runs PostgreSQL internally when `DATABASE_URL` is absent, applies migrations, seeds an empty database, and serves the storefront and API together.

No manual PostgreSQL service, database URL reference, custom build command, custom start command, or per-package Railway service is required for the first deployment. Do not create services for `@workspace/mockup-sandbox`, `@workspace/api-server`, `@workspace/api-client-react`, or `@workspace/storekit`; this monorepo is deployed from its root as one service.

The service exposes `/healthz` and `/api/health`. A successful deployment returns `ok` from `/healthz` and JSON containing `"ok": true` from `/api/health`.

## Optional production variables

| Variable | Required for first deploy | Purpose |
|---|---:|---|
| `DATABASE_URL` | No | If present, use the external PostgreSQL connection instead of the internal database. |
| `ADMIN_PASSWORD` | No | Set a new strong password before handing the store to a client. |
| `ADMIN_SECRET` | No | Recommended long random secret for signed admin tokens. |
| `SESSION_SECRET` | No | Optional application session secret. |
| `NODE_ENV` | No | Defaults to `production` in the Docker image. |
| `UPLOAD_DIR` | No | Set to `/app/data/uploads` when using a `/app/data` Railway Volume. |

The initial admin password is `storekit2024` for first-run access only. Change it in Railway Variables before production handoff.

## Data persistence

The one-click deployment is intentionally self-contained and works without external services. For a real production store that must preserve orders, admin changes, and uploaded images across container recreation, attach one Railway Volume mounted at `/app/data` and set `UPLOAD_DIR=/app/data/uploads`. The internal PostgreSQL data is stored at `/app/data/postgres`.

A Volume is not required to make the first deployment succeed. Without a Volume or external `DATABASE_URL`, the application remains functional, but an ephemeral container recreation can reset the internal database to its seed state.

## Deployment contract

The root Dockerfile uses Debian slim rather than Alpine, installs PostgreSQL server/client binaries for the self-contained fallback, copies the workspace TypeScript configuration, builds the storefront and API in separate stages, and serves both through one Express process. The root production build intentionally does not run recursive workspace builds; experimental packages such as `mockup-sandbox` are not production services.

For the full Railway procedure, runtime behavior, persistence guidance, health checks, and troubleshooting, read [`RAILWAY.md`](./RAILWAY.md).
