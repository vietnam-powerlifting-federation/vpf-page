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

RUN npm rebuild
RUN npm run build

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
