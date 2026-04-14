#!/bin/sh

set -eu

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
API_URL="${VITE_API_URL:-http://localhost:${API_PORT:-5005}}"
DASHBOARD_URL="http://localhost:${DASHBOARD_PORT:-3000}"

echo "Starting Docker Compose stack..."
docker compose $COMPOSE_FILES up -d --build

echo "Waiting for API health endpoint..."
attempt=0
until curl -fsS "$API_URL/api/health" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "API health check did not become ready in time"
    docker compose $COMPOSE_FILES logs --tail=200
    exit 1
  fi
  sleep 2
done

echo "Waiting for dashboard..."
attempt=0
until curl -fsS "$DASHBOARD_URL" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "Dashboard did not become ready in time"
    docker compose $COMPOSE_FILES logs --tail=200
    exit 1
  fi
  sleep 2
done

echo "Checking agent registration..."
attempt=0
until curl -fsS "$API_URL/api/agents" | grep -q '"agentId":"agent-'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "No agents were registered in time"
    docker compose $COMPOSE_FILES logs --tail=200
    exit 1
  fi
  sleep 2
done

echo "Checking metrics ingestion..."
attempt=0
until curl -fsS "$API_URL/api/agents/agent-1/metrics?type=cpu&range=1h&limit=1" | grep -q '"metricType":"cpu"'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "No CPU metrics were ingested in time"
    docker compose $COMPOSE_FILES logs --tail=200
    exit 1
  fi
  sleep 2
done

echo "Checking security endpoints..."
attempt=0
until curl -fsS "$API_URL/api/security/overview" | grep -q '"averageHardeningScore"'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "Security overview did not become ready in time"
    docker compose $COMPOSE_FILES logs --tail=200
    exit 1
  fi
  sleep 2
done

attempt=0
until curl -fsS "$API_URL/api/agents/agent-1/security" | grep -q '"overallStatus"'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "Agent security profile did not become ready in time"
    docker compose $COMPOSE_FILES logs --tail=200
    exit 1
  fi
  sleep 2
done

echo "Docker smoke test passed."
