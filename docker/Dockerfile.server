FROM node:20-slim AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY packages/server/package.json ./packages/server/package.json
COPY packages/server/tsconfig.json ./packages/server/tsconfig.json

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

RUN npm run build --workspace @monitor/shared && npm run build --workspace @monitor/server

FROM node:20-slim
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/package.json ./packages/server/package.json
COPY --from=build /app/packages/server/dist ./packages/server/dist

CMD ["node", "packages/server/dist/index.js"]
