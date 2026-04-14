FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:5005
ARG VITE_WS_URL=ws://localhost:5005/ws

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY packages/dashboard/package.json ./packages/dashboard/package.json
COPY packages/dashboard/tsconfig.json ./packages/dashboard/tsconfig.json
COPY packages/dashboard/index.html ./packages/dashboard/index.html
COPY packages/dashboard/vite.config.ts ./packages/dashboard/vite.config.ts

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY packages/dashboard ./packages/dashboard

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build --workspace @monitor/dashboard

FROM nginx:1.27-alpine

COPY packages/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/dashboard/dist /usr/share/nginx/html
