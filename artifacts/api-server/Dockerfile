FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY lib/db/package.json ./lib/db/package.json

RUN pnpm install --frozen-lockfile

COPY artifacts/api-server ./artifacts/api-server
COPY lib/db ./lib/db

RUN pnpm --filter @workspace/api-server build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable \
    && corepack prepare pnpm@10.17.1 --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/artifacts/api-server ./artifacts/api-server
COPY --from=builder /app/lib/db ./lib/db

EXPOSE 3000

WORKDIR /app/artifacts/api-server

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]