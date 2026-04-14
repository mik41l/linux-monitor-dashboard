# Testing Guide

## Automated Tests
```bash
npm test
```

## Workspace Builds
```bash
npm run build --workspace @monitor/shared
npm run build --workspace @monitor/agent
npm run build --workspace @monitor/server
npm run build --workspace @monitor/dashboard
```

## Docker Smoke Test
```bash
./scripts/docker-smoke.sh
```

## What Is Covered
- Shared protocol encode/decode
- `/proc` parser logic
- SSHD, port scan, firewall, and login-activity parsing rules
- IPC primitives
- Fastify route surface
- TCP ingest path

## Manual Checks
- Open `/agents/agent-1`
- Open `/security`
- Open `/agents/agent-1/security`
- Verify the UI handles missing SSHD or firewall tooling without runtime crashes
