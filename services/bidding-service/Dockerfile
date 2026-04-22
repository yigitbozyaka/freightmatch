FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/bidding-service/package.json services/bidding-service/
COPY services/user-service/package.json services/user-service/
COPY services/load-service/package.json services/load-service/
COPY services/matching-service/package.json services/matching-service/
COPY shared/contracts/package.json shared/contracts/
COPY shared/instrumentation/package.json shared/instrumentation/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY services/bidding-service/tsconfig.json services/bidding-service/
COPY shared/instrumentation/tsconfig.json shared/instrumentation/
COPY services/bidding-service/src services/bidding-service/src
COPY shared/contracts shared/contracts
COPY shared/instrumentation shared/instrumentation
RUN pnpm --filter @freightmatch/contracts build
RUN pnpm --filter @freightmatch/instrumentation build
RUN pnpm --filter @freightmatch/bidding-service build

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/bidding-service/package.json services/bidding-service/
COPY services/user-service/package.json services/user-service/
COPY services/load-service/package.json services/load-service/
COPY services/matching-service/package.json services/matching-service/
COPY shared/contracts/package.json shared/contracts/
COPY shared/instrumentation/package.json shared/instrumentation/
COPY --from=builder /app/shared/contracts/dist shared/contracts/dist
COPY --from=builder /app/shared/instrumentation/dist shared/instrumentation/dist
RUN pnpm install --frozen-lockfile --prod
WORKDIR /app/services/bidding-service
COPY --from=builder /app/services/bidding-service/dist ./dist
EXPOSE 3003
CMD ["node", "dist/index.js"]
