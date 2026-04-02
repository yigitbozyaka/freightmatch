FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/user-service/package.json services/user-service/
COPY services/load-service/package.json services/load-service/
COPY services/bidding-service/package.json services/bidding-service/
COPY services/matching-service/package.json services/matching-service/
COPY shared/contracts/package.json shared/contracts/
COPY shared/instrumentation/package.json shared/instrumentation/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/user-service/tsconfig.json services/user-service/
COPY shared/instrumentation/tsconfig.json shared/instrumentation/
COPY services/user-service/src services/user-service/src
COPY shared/instrumentation shared/instrumentation
RUN pnpm --filter @freightmatch/instrumentation build
RUN pnpm --filter @freightmatch/user-service build

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/user-service/package.json services/user-service/
COPY services/load-service/package.json services/load-service/
COPY services/bidding-service/package.json services/bidding-service/
COPY services/matching-service/package.json services/matching-service/
COPY shared/contracts/package.json shared/contracts/
COPY shared/instrumentation/package.json shared/instrumentation/
RUN pnpm install --frozen-lockfile --prod
WORKDIR /app/services/user-service
COPY --from=builder /app/shared/instrumentation/dist shared/instrumentation/dist
COPY --from=builder /app/services/user-service/dist ./dist
ENV NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
EXPOSE 3001
CMD ["node", "dist/index.js"]
