# Monitoring

Metrics, logs and dashboards for the app, run from the same `docker-compose.yml`
within a 1.2 GB memory budget for the whole project.

| Service | Role | `mem_limit` |
|---|---|---|
| app | Nuxt server; serves `/api/metrics` and `/api/health` | 400 MB |
| redis | Cache, capped at `maxmemory 48mb` | 128 MB |
| victoriametrics | Stores metrics and scrapes every target in `victoriametrics/scrape.yml` | 160 MB |
| victorialogs | Stores logs, 14 days or 5 GiB | 96 MB |
| vector | Ships logs from containers labelled `vpf.logs=true`; exports host CPU, memory and load | 64 MB |
| redis-exporter | Redis metrics | 32 MB |
| grafana | Dashboards and alerting | 256 MB |

No tracing: with one server, one database and one cache, request latency by
route plus the `errorId` on every 500 covers what traces would show.

## Setup

1. Set `METRICS_TOKEN`, `GRAFANA_ADMIN_PASSWORD` and
   `GRAFANA_ALERT_DISCORD_WEBHOOK_URL` in `.env`. Compose refuses to start
   without them. Set `LOG_LEVEL=http` too: the one-line-per-request
   log is written at `http` level, which the default `info` drops. Metrics do
   not depend on it.
2. `docker compose up -d`
3. Grafana listens on `127.0.0.1:3002` only. From your machine:
   `ssh -L 3002:localhost:3002 <server>`, then open http://localhost:3002 and
   sign in as `admin`. The **VPF › VPF overview** dashboard is provisioned.

## Outside this box

- **Uptime**: point an external checker (UptimeRobot, Better Stack) at
  `https://<host>/api/health`. It returns 503 when Postgres is unreachable; a
  Redis outage is reported in the body but still a 200, since the cache is optional.
  Nothing on this server can tell you it is down.

## Alerts

Provisioned from `grafana/provisioning/alerting/` and posted to Discord: one
message per rule when it fires, a reminder every 4 h while it keeps firing,
and one when it resolves.

| Rule | Fires when | Severity |
|---|---|---|
| Scrape target down | a target misses scrapes for 2 min | critical |
| App 5xx ratio high | over 5% of requests fail for 5 min, and at least 5 did in 10 min | critical |
| App p95 latency high | p95 above 2 s for 10 min, with at least 20 requests in 10 min | warning |
| Service memory near its limit | a service above 90% of its `mem_limit` for 5 min | warning |
| Service restarted | a process restarts: a crash or an OOM kill, or a deploy | warning |
| Disk space low | under 2 GiB free for 10 min | critical |
| Redis evicting keys | the cache no longer fits in `maxmemory` | warning |

The memory rule divides by the `mem_limit` values; change them with the limits
in `docker-compose.yml`. Rules are read-only in the UI, like the dashboard.

Nothing here can report that the whole server is down, Grafana included; that
is the external uptime check's job.

## Finding things

- **A user reports "error ref 3f2a…"**: in Grafana Explore, VictoriaLogs:
  `service:app errorId:3f2a…`
- **Slow endpoint**: the "p95 latency by route" panel, then
  `service:app route:"/api/results" durationMs:>1000` in Explore.
- **Raw metric names**: `http_request_duration_seconds` (labels `method`,
  `route`, `status`), `cache_lookups_total` (`resource`, `result`), plus
  the Node defaults from `@prometheus-io/client` (`nodejs_*`, `process_*`).

## Changing the dashboard

Dashboards are provisioned from `grafana/dashboards/` and are read-only in the
UI. Edit a copy in Grafana, export its JSON, and replace the file.
