# Installation And Docker Runbook

## Goal
Bring up PostgreSQL, server, dashboard, and three demo agents with a single Docker Compose workflow.

## Prerequisites
- Docker Desktop or Docker Engine with Compose v2
- Free local ports: `3000`, `5005`, `5432`, `9010`

## First Start
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

## Verification
- API health: `http://localhost:5005/api/health`
- Dashboard: `http://localhost:3000`
- Agents list: `http://localhost:5005/api/agents`
- Security overview: `http://localhost:5005/api/security/overview`

## Clean Reset
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

## Troubleshooting
- If agents reconnect repeatedly, inspect `docker compose logs server agent-1`
- If the dashboard loads but shows no data, verify the API and websocket URL build args
- If a security module is unavailable inside the container, the UI should show `unavailable` instead of crashing
