
# Runbook — Qdrant Latency Spikes

## Symptoms
- Vector queries > expected latency, especially under load.

## Triage
- Check Qdrant logs & collection status.
- Validate payload filters and `topK` not too high.
- Ensure RAM available; consider mmap tuning.

## Mitigation
- Reduce `topK` or use pre-filtering in Mongo.
- Warm collections at startup (optional).
- Scale Qdrant CPU/RAM.
