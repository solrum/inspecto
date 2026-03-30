FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Dependencies ────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --prod=false

# ─── Build shared package ───────────────────────────────────────────────
FROM deps AS build-shared
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
RUN pnpm --filter @inspecto/shared build

# ─── Build Web ───────────────────────────────────────────────────────────
FROM build-shared AS build
COPY apps/web/ apps/web/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter @inspecto/web build

# ─── Production ──────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

# Next.js standalone output
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static apps/web/.next/static/
COPY --from=build /app/apps/web/public apps/web/public/

WORKDIR /app/apps/web
EXPOSE 3000

CMD ["node", "server.js"]
