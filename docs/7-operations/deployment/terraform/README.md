# Terraform Infrastructure as Code

## Overview
This directory contains Terraform configuration for provisioning AWS infrastructure for Kaleem AI in multiple environments.

## Architecture
- **AWS Provider**: EKS cluster, RDS database, ElastiCache Redis, S3 buckets
- **Multi-environment**: Separate resources for staging and production
- **High Availability**: Multi-AZ deployment with load balancing
- **Security**: Private subnets, security groups, IAM roles

## Prerequisites
- Terraform >= 1.0
- AWS CLI configured
- kubectl configured for EKS access

## Environment Variables
```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
```

## Usage

### Initialize Terraform
```bash
cd deployment/terraform
terraform init
```

### Plan Deployment
```bash
# For staging
terraform plan -var="environment=staging"

# For production
terraform plan -var="environment=production"
```

### Deploy Infrastructure
```bash
# Deploy staging
terraform apply -var="environment=staging"

# Deploy production
terraform apply -var="environment=production"
```

### Update Infrastructure
```bash
# Plan changes
terraform plan

# Apply changes
terraform apply
```

### Destroy Infrastructure
```bash
# Destroy staging
terraform destroy -var="environment=staging"

# Destroy production
terraform destroy -var="environment=production"
```

## Components

### EKS Cluster
- **Cluster Name**: `kaleem-{environment}`
- **Node Groups**: Auto-scaling node groups
- **Addons**: CoreDNS, kube-proxy, vpc-cni

### Database (RDS)
- **Engine**: MongoDB 7.0
- **Instance Class**: t3.medium (configurable)
- **Backup**: 7-day retention
- **Multi-AZ**: Enabled for production

### Cache (ElastiCache)
- **Engine**: Redis 7.0
- **Node Type**: cache.t3.micro (configurable)
- **Cluster Mode**: Disabled (single node)

### Storage (S3)
- **Bucket**: `kaleem-{environment}-backups`
- **Versioning**: Enabled
- **Encryption**: SSE-S3
- **Lifecycle**: 30-day retention

## Security

### Network Security
- **VPC**: 10.0.0.0/16 CIDR
- **Public Subnets**: 10.0.0.0/24, 10.0.1.0/24
- **Private Subnets**: 10.0.10.0/24, 10.0.11.0/24
- **Security Groups**: Database, cache, application

### Access Control
- **EKS**: IAM roles for service accounts (IRSA)
- **RDS**: IAM database authentication
- **S3**: Bucket policies and IAM policies

### Secrets Management
- **AWS Secrets Manager**: Store sensitive configuration
- **Kubernetes Secrets**: Application secrets
- **External Secrets Operator**: Sync secrets from AWS Secrets Manager

## Cost Optimization

### Right-sizing
- **EKS Nodes**: Start with t3.medium, scale based on metrics
- **RDS**: Monitor CPU/memory, adjust instance class
- **ElastiCache**: Monitor memory usage, adjust node type

### Auto-scaling
- **Cluster Autoscaler**: Scale nodes based on pod requirements
- **HPA**: Scale deployments based on CPU/memory
- **Scheduled Scaling**: Scale down during off-hours

### Storage Optimization
- **EBS**: Use gp3 for better performance/cost ratio
- **S3**: Use lifecycle rules to move old data to cheaper storage
- **ElastiCache**: Use reserved instances for predictable workloads

## Monitoring

### CloudWatch Integration
- **EKS**: Container Insights enabled
- **RDS**: Enhanced Monitoring enabled
- **ElastiCache**: Engine logs and metrics
- **Custom Metrics**: Application metrics via CloudWatch agent

### Alerting
- **CloudWatch Alarms**: CPU, memory, disk usage
- **SNS Topics**: Email and Slack notifications
- **PagerDuty**: On-call engineer notifications

## Troubleshooting

### Common Issues
- **EKS Node Scaling**: Check resource requests/limits
- **Database Connections**: Monitor connection pool settings
- **Cache Evictions**: Monitor memory usage and adjust instance size
- **S3 Access**: Verify bucket policies and IAM permissions

### Debug Commands
```bash
# Check EKS cluster status
aws eks describe-cluster --name kaleem-staging

# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier kaleem-staging

# Check ElastiCache cluster
aws elasticache describe-cache-clusters --cache-cluster-id kaleem-staging

# Check S3 bucket
aws s3 ls s3://kaleem-staging-backups
```

## Migration from Docker Compose

### Phase 1: Infrastructure Provisioning
1. Deploy Terraform infrastructure
2. Migrate data from existing MongoDB
3. Update application configuration
4. Test application on new infrastructure

### Phase 2: Application Migration
1. Update application to use new endpoints
2. Configure Kubernetes secrets and configmaps
3. Deploy application to EKS
4. Validate functionality

### Phase 3: Go-live
1. Switch DNS to new load balancer
2. Monitor application metrics
3. Validate backup and recovery procedures
4. Decommission old infrastructure

## Support

### Documentation
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws)
- [EKS Documentation](https://docs.aws.amazon.com/eks/)
- [RDS Documentation](https://docs.aws.amazon.com/AmazonRDS/)

### Contacts
- **DevOps Team**: devops@kaleem-ai.com
- **Infrastructure Lead**: infrastructure@kaleem-ai.com
- **Emergency**: +966-50-123-4567
