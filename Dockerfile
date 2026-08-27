FROM node:22-alpine AS base
WORKDIR /app
# Prisma's query engine binary is linked against OpenSSL, which the base
# node:22-alpine image doesn't ship -- without it the engine fails to load
# at runtime with a "libssl not found" error.
RUN apk add --no-cache openssl

# ---- deps: full install (incl. devDependencies), used to build ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile TypeScript + generate the Prisma client ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# docker-compose's `migrate` service targets this stage directly to run
# `prisma migrate deploy` with the full toolchain (incl. the `prisma` CLI,
# which is intentionally a devDependency and doesn't ship in `runtime`).

# ---- prod-deps: production-only node_modules ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
# --ignore-scripts: the package.json `prepare` script runs `husky`, a
# devDependency that isn't installed here (--omit=dev) -- it would fail
# npm ci outright. Git hooks are irrelevant to a production install anyway.
RUN npm ci --omit=dev --ignore-scripts

# ---- runtime: minimal image actually shipped/run ----
FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=prod-deps /app/node_modules ./node_modules
# @prisma/client's own package code is static; the part `prisma generate`
# actually produces (query engine + generated client) lives entirely under
# .prisma/client, so it's copied in from `build` rather than re-generated
# here -- prod-deps has no `prisma` CLI (a devDependency) to do that with.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY package.json ./
USER app
EXPOSE 3000
CMD ["node", "dist/server.js"]
