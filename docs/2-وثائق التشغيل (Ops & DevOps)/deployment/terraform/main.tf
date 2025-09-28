# Terraform Infrastructure as Code
# For future multi-environment deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
  profile = var.aws_profile
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name = "kaleem-vpc"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public" {
  count = 2
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "kaleem-public-${count.index}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count = 2
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "kaleem-private-${count.index}"
    Environment = var.environment
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name = "kaleem-${var.environment}"
  version = "1.28"

  vpc_config {
    subnet_ids = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access = var.environment == "production" ? false : true
  }

  tags = {
    Environment = var.environment
  }
}

# Node Groups
resource "aws_eks_node_group" "main" {
  cluster_name = aws_eks_cluster.main.name
  node_group_name = "kaleem-${var.environment}-nodes"
  node_role_arn = aws_iam_role.node.arn
  subnet_ids = aws_subnet.private[*].id

  scaling_config {
    desired_size = var.node_desired_size
    max_size = var.node_max_size
    min_size = var.node_min_size
  }

  instance_types = var.instance_types

  tags = {
    Environment = var.environment
  }
}

# RDS Database
resource "aws_db_instance" "main" {
  identifier = "kaleem-${var.environment}"
  engine = "mongo"
  engine_version = "7.0"
  instance_class = var.db_instance_class
  allocated_storage = var.db_allocated_storage

  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]

  backup_retention_period = 7
  backup_window = "02:00-03:00"
  maintenance_window = "sun:03:00-sun:04:00"

  tags = {
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "main" {
  cluster_id = "kaleem-${var.environment}"
  engine = "redis"
  node_type = var.redis_node_type
  num_cache_nodes = var.redis_num_nodes
  parameter_group_name = "default.redis7"
  port = 6379

  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.cache.id]

  tags = {
    Environment = var.environment
  }
}

# S3 Bucket for Backups
resource "aws_s3_bucket" "backups" {
  bucket = "kaleem-${var.environment}-backups"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id = "backup_retention"
    enabled = true
    prefix = "backups/"

    expiration {
      days = 30
    }

    noncurrent_version_expiration {
      days = 7
    }
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = {
    Environment = var.environment
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type = string
  default = "us-east-1"
}

variable "aws_profile" {
  description = "AWS profile"
  type = string
  default = "default"
}

variable "environment" {
  description = "Environment name"
  type = string
  validation {
    condition = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production"
  }
}

variable "node_desired_size" {
  description = "Desired number of nodes"
  type = number
  default = 2
}

variable "node_max_size" {
  description = "Maximum number of nodes"
  type = number
  default = 5
}

variable "node_min_size" {
  description = "Minimum number of nodes"
  type = number
  default = 1
}

variable "instance_types" {
  description = "EC2 instance types"
  type = list(string)
  default = ["t3.medium"]
}

variable "db_instance_class" {
  description = "RDS instance class"
  type = string
  default = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type = number
  default = 20
}

variable "redis_node_type" {
  description = "Redis node type"
  type = string
  default = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type = number
  default = 1
}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name = "region-name"
    values = [var.aws_region]
  }
}

# Outputs
output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "database_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.backups.bucket
}
