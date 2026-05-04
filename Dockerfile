# Rangu.fam — Next.js standalone build for Cloud Run.
#
# Build (from repo root):
#   docker build -t rangu-fam .
#
# Run locally:
#   docker run --rm -p 8080:8080 --env-file .env.local rangu-fam

# ---------- 1. deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# ---------- 2. build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build-time env vars baked into the bundle (NEXT_PUBLIC_* only)
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_ACCOUNTS_BASE_URL=https://accounts.doublej.app
ENV NEXT_PUBLIC_ACCOUNTS_BASE_URL=$NEXT_PUBLIC_ACCOUNTS_BASE_URL

# Stub server-side env vars so Next.js page-data collection (which loads route
# handlers and transitively their modules) doesn't crash on getRequiredEnv().
# These are NEVER read at runtime — Cloud Run --set-secrets supplies real values.
ENV POSTGRES_BRIDGE_URI=mongodb://build-only-stub
ENV JWT_SECRET=build-only-stub-replaced-at-runtime
ENV NEXTAUTH_SECRET=build-only-stub-replaced-at-runtime

RUN npm run build

# ---------- 3. runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Next.js standalone output is fully self-contained
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 8080

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
