
# Runbook — Redis Connection Exhaustion

## Symptoms
- Errors: `max number of clients reached` or timeouts.
- App latency increases; cache misses rise.

## Triage
- Check Redis `INFO clients` and `maxclients`.
- Confirm connection pooling in app config.
- Verify no connection leak in background jobs.

## Mitigation
- Increase `maxclients` conservatively.
- Fix pooling: reuse single connection per process with pool.
- Add backoff/retry with jitter for spikes.
