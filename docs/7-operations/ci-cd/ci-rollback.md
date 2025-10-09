# Rollback Procedures — Kaleem AI

> هدف الإجراء: العودة الآمنة والسريعة لإصدار سابق عند حدوث فشل، مع ضمان سلامة البيانات.

## 0) الملخص التنفيذي (TL;DR)
- **حالة Rollback**: **آلي جزئياً** (عبر deploy.sh script)
- **Backup Strategy**: Automatic MongoDB backup قبل كل deployment
- **Rollback Types**: Image rollback + Database rollback + Manual steps
- **Detection**: Health check failures trigger automatic rollback
- **Timeline**: < 5 minutes للـ image rollback، < 15 minutes للـ database rollback
- **Data Safety**: Zero data loss guarantee مع backup rotation

## 1) مبادئ Rollback (الواقع الحقيقي)
- **Reversible Deploys**: كل deployment يحتفظ بـ previous image reference
- **Atomic Operations**: Deploy أو rollback كامل أو فشل كامل
- **Data Safety**: Backup قبل أي تغيير + rollback capability
- **Monitoring**: Health checks تكشف الفشل وتفعل rollback
- **Communication**: Manual notification للفريق عند rollback

## 2) Rollback Triggers (أسباب الرجوع)

### Automatic Triggers
- **Health Check Failure**: `/api/health` لا يستجيب
- **Database Connection Loss**: MongoDB/Redis/Qdrant غير متاح
- **High Error Rate**: > 5% error rate لمدة > 2 minutes
- **Performance Degradation**: Response time > 1 second لمدة > 1 minute

### Manual Triggers
- **Critical Bug Discovery**: Bugs تؤثر على core functionality
- **Security Issues**: Vulnerabilities discovered post-deployment
- **Data Corruption**: Database integrity issues
- **External Dependencies**: Third-party service failures

## 3) Rollback Process (المحدث - Automated)

### 1. Automatic Detection
```bash
# deploy.sh script monitors health
curl -fsS "$HEALTH_URL" || {
  log "❌ Health check failed - initiating rollback"
  # Automatic rollback logic
}
```

### 2. Image Rollback
```bash
# Automatic rollback to previous image
export KALEEM_API_IMAGE="$PREV_IMAGE"
docker compose -f docker-compose.yml -f docker-compose.image.override.yml up -d --no-deps api
```

### 3. Verification
```bash
# Verify rollback success
curl -f http://localhost:3000/api/health
docker compose ps | grep -q "Up" || exit 1
```

### 4. Notification
```bash
# Manual notification (no automated alerts currently)
log "🔙 Rollback completed - notify team manually"
```

## 4) Manual Rollback Procedures (خطوات يدوية)

### Image Rollback (سريع - < 2 minutes)
```bash
# 1. Identify current deployment
CURRENT_IMAGE=$(docker compose ps --format json | jq -r '.[] | select(.Service=="api") | .Image')

# 2. Identify previous image (from logs or docker history)
PREV_IMAGE="ghcr.io/owner/repo/kaleem-api:v0.0.1"

# 3. Deploy previous image
export KALEEM_API_IMAGE="$PREV_IMAGE"
docker compose -f docker-compose.yml -f docker-compose.image.override.yml up -d --no-deps api

# 4. Verify rollback
curl -f http://localhost:3000/api/health
```

### Database Rollback (متوسط - < 10 minutes)
```bash
# 1. Identify backup file
BACKUP_DIR="/opt/kaleem/backups"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/mongo-*.archive.gz | head -1)

# 2. Stop application
docker compose stop api

# 3. Restore database
docker run --rm --network host -v "$BACKUP_DIR:/backup" mongo:5 \
  bash -lc "mongorestore --uri='$MONGODB_URI' --archive=/backup/$(basename $LATEST_BACKUP) --gzip"

# 4. Restart application
docker compose up -d api

# 5. Verify restoration
curl -f http://localhost:3000/api/health
```

### Full System Rollback (بطيء - < 15 minutes)
```bash
# 1. Backup current state (if needed)
# 2. Stop all services
docker compose down

# 3. Restore database from backup
# (see Database Rollback steps above)

# 4. Deploy previous image
# (see Image Rollback steps above)

# 5. Start services in order
docker compose up -d mongo redis qdrant rabbitmq
sleep 30  # Wait for services to be ready
docker compose up -d api frontend nginx

# 6. Verify full system
curl -f http://localhost/api/health
curl -f http://localhost/health
```

## 5) Rollback Scenarios (سيناريوهات محددة)

### Scenario 1: API Service Failure
```bash
# Trigger: /api/health fails
# Automatic Action: deploy.sh rolls back to previous image
# Manual Verification: Check logs and API responses
# Timeline: < 3 minutes
```

### Scenario 2: Database Corruption
```bash
# Trigger: Application can't read/write to database
# Action: Manual database rollback to previous backup
# Verification: Test critical operations (auth, products, orders)
# Timeline: < 10 minutes
```

### Scenario 3: Performance Regression
```bash
# Trigger: Response time > 1s for > 2 minutes
# Action: Rollback to previous version
# Verification: Monitor performance metrics
# Timeline: < 5 minutes
```

### Scenario 4: Security Vulnerability
```bash
# Trigger: Critical security issue discovered
# Action: Immediate rollback + security patch
# Verification: Security scan + penetration testing
# Timeline: < 15 minutes
```

## 6) Rollback Testing (اختبار الرجوع)

### Regular Rollback Drills
- **Monthly Testing**: اختبار rollback procedures
- **Pre-deployment**: اختبار rollback قبل كل release
- **Post-incident**: اختبار rollback بعد أي incident

### Rollback Test Checklist
- [ ] Image rollback works correctly
- [ ] Database rollback restores data accurately
- [ ] Application functions normally after rollback
- [ ] No data loss during rollback process
- [ ] Rollback time meets SLA requirements

### Automated Rollback Testing
```bash
# Test rollback functionality (future)
#!/bin/bash
# 1. Deploy test version
# 2. Verify deployment
# 3. Trigger rollback
# 4. Verify rollback success
# 5. Report results
```

## 7) Monitoring & Alerting (المستقبلي)

### Rollback Detection
- **Automated Health Monitoring**: 24/7 health checks
- **Error Rate Monitoring**: Alert on > 5% error rate
- **Performance Monitoring**: Alert on response time degradation
- **Database Monitoring**: Connection pool and query performance

### Alert Channels
- **Internal Alerts**: Slack/Teams notifications
- **External Alerts**: Email/SMS for critical issues
- **Dashboard Alerts**: Grafana alerts for metrics
- **PagerDuty**: On-call engineer notifications

### Rollback Metrics
- **Rollback Frequency**: Track rollback occurrences
- **Rollback Success Rate**: Measure rollback effectiveness
- **Mean Time to Recovery (MTTR)**: Track recovery time
- **Data Loss Incidents**: Monitor for data integrity issues

## 8) Documentation & Communication

### Post-Rollback Documentation
- **Incident Report**: Root cause analysis
- **Timeline**: Step-by-step rollback timeline
- **Lessons Learned**: Prevention measures
- **Action Items**: Follow-up tasks

### Team Communication
- **Immediate Notification**: Slack message for all rollbacks
- **Status Updates**: Regular updates during rollback process
- **Post-mortem**: Detailed analysis after incident resolution
- **Documentation Updates**: Update procedures based on learnings

### User Communication
- **Service Status**: Public status page updates
- **Customer Notifications**: Email alerts for service disruptions
- **SLA Compliance**: Track and report SLA breaches
- **Compensation Policies**: Service credit policies for downtime

## 9) Best Practices (المحدث)

### Rollback Best Practices
- **Test Rollbacks**: Regular testing of rollback procedures
- **Backup Validation**: Verify backup integrity before deployment
- **Gradual Rollback**: Test rollback on non-critical components first
- **Communication Plan**: Clear communication channels for incidents
- **Documentation**: Detailed rollback procedures for all scenarios

### Prevention Measures
- **Comprehensive Testing**: Unit + Integration + E2E before deployment
- **Staged Rollouts**: Gradual deployment to catch issues early
- **Monitoring**: Proactive monitoring to detect issues
- **Code Reviews**: Thorough review process before deployment
- **Automated Testing**: CI/CD pipeline with quality gates

## 10) Future Improvements (المستقبلي)

### Advanced Rollback Features
- **Zero-Downtime Rollbacks**: Blue-green deployment support
- **Automated Rollback Triggers**: AI-based anomaly detection
- **Rollback Analytics**: ML-powered rollback prediction
- **Multi-Region Rollbacks**: Cross-region deployment management
- **Infrastructure Rollback**: Terraform state rollback capability

### Enhanced Monitoring
- **Predictive Monitoring**: Anomaly detection before failures
- **Business Metrics Monitoring**: Track business impact of rollbacks
- **Automated Incident Response**: ChatOps integration for rollbacks
- **Rollback Simulation**: Test rollback scenarios in staging
- **Rollback Reporting**: Comprehensive rollback analytics dashboard
