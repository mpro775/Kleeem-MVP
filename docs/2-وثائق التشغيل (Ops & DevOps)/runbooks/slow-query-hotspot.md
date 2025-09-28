
# Runbook — Slow Query Hotspot

## Symptoms
- P95 latency spikes.
- CPU high on MongoDB; slow endpoints.

## Diagnosis (10 min)
1. **MongoDB profiler** (if enabled) or `db.currentOp()` to see slow ops.
2. **Review indexes** for the hot collection(s).
3. **Check query shape** (filters/sorts). Ensure covered indexes.

## Mitigation
- Add appropriate **compound index** aligned with sort & filter.
- Reduce payload / projection fields.
- Use **cursor pagination** with stable sort key.
- Cache hot results (L1/L2 Redis) with TTL.

## Prevention
- Add performance budgets to PR checklist.
- Capture slow queries as metrics and alert when exceed threshold.
