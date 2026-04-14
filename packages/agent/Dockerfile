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

RUN apt-get update \
  && apt-get install -y --no-install-recommends iproute2 iptables netcat-openbsd nftables procps util-linux \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/agent/package.json ./packages/agent/package.json
COPY --from=build /app/packages/agent/agent.config.json ./packages/agent/agent.config.json
COPY --from=build /app/packages/agent/dist ./packages/agent/dist
COPY docker/agent-entrypoint.sh /app/agent-entrypoint.sh

ENV PROC_PATH=/host/proc
ENV LOG_PATH=/var/log

CMD ["sh", "/app/agent-entrypoint.sh"]
