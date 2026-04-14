# Architecture And Data Flow

## Layers
- Agent: collects metrics and security posture data inside Linux containers
- Server: accepts TCP frames, stores snapshots in PostgreSQL, exposes REST and websocket streams
- Dashboard: React SPA consuming REST snapshots and live websocket invalidations

## Agent Flow
1. Metric workers parse `/proc` and command output.
2. Security worker runs SSHD audit, open port scan, firewall audit, hardening checks, and login activity collectors.
3. Results are serialized through the shared binary frame protocol.
4. TCP client sends them to the server and handles ACK frames.

## Server Flow
1. TCP receiver parses binary frames by message type.
2. Services persist metrics, events, and security reports in PostgreSQL.
3. Websocket hub broadcasts invalidation events to the dashboard.
4. REST endpoints provide latest snapshots and aggregate security views.

## Dashboard Flow
1. TanStack Query fetches summary and detail endpoints.
2. Websocket messages invalidate relevant query keys.
3. Security overview and per-agent security detail pages combine latest SSHD, port, firewall, hardening, and login reports.

## Notes For Final Report
- Add an architecture diagram derived from this section
- Add protocol message mapping including `0x08` to `0x0C`
- Add DB table mapping for each security report type
