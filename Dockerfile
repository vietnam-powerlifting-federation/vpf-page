# syntax=docker/dockerfile:1

# The build runs on the build machine's own architecture, even when the image
# targets another (an arm64 laptop building for an amd64 server): emulating a
# Nuxt build is slow, and on some hosts not possible at all. The runner stage
# below only copies files, so nothing executes for the target architecture.
FROM --platform=$BUILDPLATFORM node:24-slim AS builder

ARG TARGETARCH

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@11.6.2

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npm rebuild

RUN npm run build

# sharp (behind @nuxt/image's /_ipx route) is the one native module in the
# output, bundled for the build machine. When cross-building, add its prebuilt
# binaries for the target. Installed in a scratch directory: an install in /app
# would re-resolve the project's dependency tree.
RUN target=$(echo "$TARGETARCH" | sed 's/amd64/x64/') \
    && if [ -n "$target" ] && [ "$target" != "$(node -p process.arch)" ]; then \
      version=$(node -p "require('./.output/server/node_modules/sharp/package.json').version") \
      && mkdir /tmp/sharp && cd /tmp/sharp \
      && npm install --no-save --ignore-scripts --os=linux --cpu="$target" --libc=glibc "sharp@$version" \
      && cp -r node_modules/@img/. /app/.output/server/node_modules/@img/; \
    fi

FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
