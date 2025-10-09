
# Runbook — Disk Space Critical (≥ 90%)

## What it means
The node's filesystem is nearly full. Risk of service crashes and data corruption.

## Quick Triage (5–10 min)
1. **Identify culprit directories**:
   ```bash
   df -h
   sudo du -xh / | sort -h | tail -n 50
   # or focused:
   sudo du -sh /var/log/* /var/lib/docker/* 2>/dev/null | sort -h | tail
   ```
2. **Check Docker volumes & images**:
   ```bash
   docker system df
   docker volume ls
   docker ps --format '{{.Names}}: {{.Mounts}}'
   ```
3. **Loki/Promtail logs growth?** rotate & limit retention.

## Safe Mitigation
- **Rotate & prune logs**:
  ```bash
  sudo find /var/log -type f -name '*.log' -size +200M -print
  sudo truncate -s 0 /var/log/<big-file>.log
  ```
- **Docker cleanup (carefully)**:
  ```bash
  docker system prune -f
  docker volume prune -f
  ```
- **MinIO bucket retention**: verify lifecycle policies.
- **Grafana/Loki retention**: reduce days in dev/sandbox.

## Permanent Fix
- Add **logrotate** configs.
- Set **Loki retention** (e.g., 7–14 days for non-prod).
- Enable **MinIO lifecycle** rules (expire old objects).
- Add Prometheus alert: `node_filesystem_avail_bytes` threshold.
