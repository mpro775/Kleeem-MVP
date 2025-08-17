#!/usr/bin/env bash
# Baseline ZAP scan against staging (read-only, passive only)
set -euo pipefail

TARGET="${1:-http://staging.kleem.local:3000}"
docker run --rm -t owasp/zap2docker-stable zap-baseline.py -t "$TARGET" -r zap-report.html -z "-config api.key=kleemzap"
echo "Report saved to zap-report.html"
