# syntax=docker/dockerfile:1

# Debian-based rather than Alpine: better-sqlite3 and sharp resolve glibc
# prebuilds, and the runtime stage must match the builder's libc.
FROM node:24-slim AS builder

WORKDIR /app

# Toolchain for the native modules that fall back to node-gyp.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
    && rm -rf /var/lib/apt/lists/*

# package-lock.json is an artifact of the npm version that wrote it: npm versions
# disagree on how to resolve peer deps and the deps of platform-mismatched
# optional packages, and `npm ci` rejects a lock built by a version that resolved
# them differently. Keep this pinned to the npm that regenerates the lock.
RUN npm install -g npm@11.6.2

# Dependencies are installed before the source is copied so the layer is reused
# across source-only changes. Scripts are deferred because the root postinstall
# (nuxt prepare) needs the source that has not been copied yet.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# nuxt build prerenders the @nuxt/content dump and the competition pages, which
# load the Nitro bundle and with it lib/config/config.ts — that throws at import
# when these are unset. Prerendering never reaches R2 or SMTP, so placeholders
# satisfy the check without putting real secrets in the build. They stay in this
# stage; the runner reads the real values from the environment at startup.
ENV JWT_SECRET=build-time-placeholder \
    EMAIL_VERIFICATION_SKIP=true \
    CLOUDFLARE_R2_ACCOUNT_ID=build-time-placeholder \
    CLOUDFLARE_R2_ACCESS_KEY_ID=build-time-placeholder \
    CLOUDFLARE_R2_SECRET_ACCESS_KEY=build-time-placeholder \
    CLOUDFLARE_R2_VIP_BUCKET=build-time-placeholder \
    CLOUDFLARE_R2_VIP_PUBLIC_URL_BASE=https://build-time-placeholder.invalid

RUN npm rebuild

# DATABASE_URL is mounted as a build secret (not an ENV/ARG) so it never lands in
# an image layer. The prerender hook uses it to enumerate competition slugs; when
# the secret is absent or the database is unreachable, the hook skips those pages
# and the build still succeeds.
RUN --mount=type=secret,id=database_url \
    DATABASE_URL="$(cat /run/secrets/database_url 2>/dev/null || true)" \
    npm run build

FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/.output ./.output

# @nuxt/content restores its SQLite database to ./contents.sqlite on startup,
# so the working directory has to be writable by the runtime user.
RUN chown node:node /app

USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
