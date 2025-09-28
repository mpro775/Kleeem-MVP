# 🚨 Alerts & Thresholds (Prometheus Rules)

- Error rate (5xx) > 2% لمدة 5 دقائق
- Latency p95 > 800ms لمدة 5 دقائق
- Mongo connections > 80% من الحد
- Redis memory > 85%
- Queue backlog > N لمدة 10 دقائق
- No metrics scraped for service X خلال 5 دقائق

مثال RuleGroup:
```yaml
groups:
- name: kaleem-api.rules
  rules:
  - alert: HighErrorRate
    expr: sum(rate(http_requests_total{{status=~"5.."}}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.02
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High 5xx error rate
      description: "5xx > 2% للـ API خلال آخر 5 دقائق"
```
