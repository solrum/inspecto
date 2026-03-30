FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Dependencies ────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod=false

# ─── Build shared package ───────────────────────────────────────────────
FROM deps AS build-shared
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
RUN pnpm --filter @inspecto/shared build

# ─── Build API ───────────────────────────────────────────────────────────
FROM build-shared AS build
COPY apps/api/ apps/api/
RUN pnpm --filter @inspecto/api build

# ─── Production ──────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules node_modules/
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules/
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules/
COPY --from=build-shared /app/packages/shared/dist packages/shared/dist/
COPY --from=build /app/apps/api/dist apps/api/dist/
COPY apps/api/migrations apps/api/migrations/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
WORKDIR /app/apps/api
EXPOSE 3001

CMD ["node", "dist/index.js"]
