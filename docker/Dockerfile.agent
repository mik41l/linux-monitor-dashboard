FROM node:20-slim AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY packages/agent/package.json ./packages/agent/package.json
COPY packages/agent/tsconfig.json ./packages/agent/tsconfig.json

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY packages/agent ./packages/agent

RUN npm run build --workspace @monitor/shared && npm run build --workspace @monitor/agent

FROM node:20-slim
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/agent/package.json ./packages/agent/package.json
COPY --from=build /app/packages/agent/agent.config.json ./packages/agent/agent.config.json
COPY --from=build /app/packages/agent/dist ./packages/agent/dist

ENV PROC_PATH=/host/proc
ENV LOG_PATH=/var/log

CMD ["node", "packages/agent/dist/index.js"]
