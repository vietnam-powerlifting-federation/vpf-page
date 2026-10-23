# syntax=docker/dockerfile:1

FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@11.6.2

COPY package.json package-lock.json ./
RUN npm i --ignore-scripts

COPY . .

RUN npm rebuild

RUN npm run build

FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=builder --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
