FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.17.1 --activate

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/artifacts/api-server/dist ./dist

EXPOSE 3000

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]