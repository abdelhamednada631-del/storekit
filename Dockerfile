# ── Stage 1: Install ALL dependencies (dev + prod) ──────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN npm install -g pnpm@10

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json tsconfig.base.json ./
COPY lib/db/package.json                  ./lib/db/
COPY lib/api-spec/package.json            ./lib/api-spec/
COPY lib/api-zod/package.json             ./lib/api-zod/
COPY lib/api-client-react/package.json    ./lib/api-client-react/
COPY artifacts/api-server/package.json    ./artifacts/api-server/
COPY artifacts/storekit/package.json      ./artifacts/storekit/
COPY scripts/package.json                 ./scripts/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build frontend (React/Vite) ─────────────────────────────────────
FROM deps AS frontend-builder
WORKDIR /app

COPY lib/                     ./lib/
COPY artifacts/storekit/      ./artifacts/storekit/

RUN pnpm --filter @workspace/storekit build

# ── Stage 3: Build API server ─────────────────────────────────────────────────
FROM deps AS api-builder
WORKDIR /app

COPY lib/                      ./lib/
COPY artifacts/api-server/     ./artifacts/api-server/
COPY scripts/                  ./scripts/

RUN pnpm --filter @workspace/api-server run build

# ── Stage 4: Production runtime ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Sensible defaults — override any of these in Railway's Variables tab
ENV NODE_ENV=production \
    PORT=8080 \
    FRONTEND_DIST=/app/public \
    UPLOAD_DIR=/app/uploads \
    ADMIN_PASSWORD=storekit2024

# Compiled API server
COPY --from=api-builder  /app/artifacts/api-server/dist  ./artifacts/api-server/dist/
COPY --from=api-builder  /app/artifacts/api-server/package.json ./artifacts/api-server/

# Built React frontend — served as static files by Express
COPY --from=frontend-builder /app/artifacts/storekit/dist/public ./public/

# Drizzle SQL migration files — applied automatically on startup
COPY lib/db/drizzle ./artifacts/api-server/drizzle/

# Install only production dependencies
RUN npm install -g pnpm@10
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json tsconfig.base.json ./
COPY lib/db/package.json              ./lib/db/
COPY lib/api-spec/package.json        ./lib/api-spec/
COPY lib/api-zod/package.json         ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY scripts/package.json             ./scripts/
RUN pnpm install --frozen-lockfile --prod

# Persistent uploads directory (mount a volume here in production)
RUN mkdir -p /app/uploads

EXPOSE 8080

# On every start: migrate → seed (if empty) → serve
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
