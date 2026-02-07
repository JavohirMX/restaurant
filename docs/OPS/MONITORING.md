# Monitoring and Alerting Guide

> **Restaurant Management Platform - Monitoring, Metrics, and Alerting**

This document describes the monitoring setup, key metrics to track, and alerting configuration for the Restaurant Management Platform.

---

## Table of Contents

1. [Monitoring Overview](#monitoring-overview)
2. [Key Metrics](#key-metrics)
3. [Health Check Endpoints](#health-check-endpoints)
4. [Log Aggregation](#log-aggregation)
5. [Performance Monitoring](#performance-monitoring)
6. [Uptime Monitoring](#uptime-monitoring)
7. [Alerting Configuration](#alerting-configuration)
8. [Dashboard Setup](#dashboard-setup)

---

## Monitoring Overview

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Collection                           │
├───────────────┬───────────────┬───────────────┬─────────────┤
│  Application  │   System      │   Database    │   Network   │
│   (Metrics)   │  (Node Exporter)│ (PostgreSQL) │  (Logs)    │
└───────┬───────┴───────┬───────┴───────┬───────┴──────┬──────┘
        │               │               │              │
        └───────────────┴───────┬───────┴──────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Prometheus         │
                    │    (Time Series DB)   │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼──────┐      ┌────────▼────────┐   ┌─────────▼────────┐
│   Grafana    │      │   Alertmanager  │   │   Loki/Grafana   │
│ (Dashboards) │      │   (Alerts)      │   │   (Logs)         │
└──────────────┘      └─────────────────┘   └──────────────────┘
```

### Monitoring Principles

1. **White-box Monitoring**: Application exposes metrics
2. **Black-box Monitoring**: External health checks
3. **Log Aggregation**: Centralized log collection
4. **Distributed Tracing**: Request flow tracking (future)

---

## Key Metrics

### Application Metrics

#### HTTP Request Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_requests_total` | Total requests by method/status | - |
| `http_request_duration_seconds` | Request latency (histogram) | p99 > 2s |
| `http_request_size_bytes` | Request body size | - |
| `http_response_size_bytes` | Response body size | - |

#### Business Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `reservations_created_total` | Reservations created | - |
| `reservations_cancelled_total` | Reservations cancelled | spike > 50% |
| `active_users_total` | Currently active users | - |
| `failed_login_attempts_total` | Failed login attempts | > 10/min |

### System Metrics

#### Resource Usage

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `cpu_usage_percent` | CPU utilization | > 70% | > 90% |
| `memory_usage_percent` | Memory utilization | > 80% | > 95% |
| `disk_usage_percent` | Disk utilization | > 80% | > 90% |
| `disk_io_wait_percent` | Disk I/O wait | > 20% | > 50% |

#### Network Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `network_receive_bytes_total` | Incoming traffic | - |
| `network_transmit_bytes_total` | Outgoing traffic | - |
| `connections_active` | Active connections | > 1000 |

### Database Metrics

#### Performance

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `pg_stat_activity_count` | Active connections | > 80 | > 95 |
| `pg_stat_database_xact_commit` | Transactions/sec | - | - |
| `pg_stat_database_xact_rollback` | Rollbacks/sec | > 1% | > 5% |
| `pg_stat_database_blks_read` | Disk blocks read | spike | - |
| `pg_stat_database_blks_hit` | Cache hits | < 95% | < 90% |

#### Replication (if applicable)

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `pg_replication_lag_seconds` | Replication lag | > 30s |

### Redis Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `redis_memory_used_bytes` | Memory usage | > 80% | > 95% |
| `redis_connected_clients` | Client connections | > 100 | > 500 |
| `redis_keyspace_hits_total` | Cache hits | - | - |
| `redis_keyspace_misses_total` | Cache misses | > 20% | > 50% |
| `redis_expired_keys_total` | Expired keys/sec | spike | - |

---

## Health Check Endpoints

### Backend Health Endpoint

**URL**: `GET /api/health/`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": {"status": "up", "response_time_ms": 5},
    "redis": {"status": "up", "response_time_ms": 2},
    "disk": {"status": "up", "free_percent": 65}
  }
}
```

### Frontend Health Endpoint

**URL**: `GET /api/health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T10:30:00Z",
  "version": "1.0.0"
}
```

### Readiness Probe

**URL**: `GET /api/health/ready/`

Checks:
- Database connectivity
- Redis connectivity
- Required migrations applied

### Liveness Probe

**URL**: `GET /api/health/live/`

Simple check that the application is running.

---

## Log Aggregation

### Log Structure

All logs are output in JSON format for easy parsing:

```json
{
  "timestamp": "2026-01-31T10:30:00.123Z",
  "level": "INFO",
  "logger": "restaurant.request",
  "message": "Request completed",
  "request_id": "abc123def456",
  "method": "GET",
  "path": "/api/v1/reservations",
  "status_code": 200,
  "duration_ms": 45.2,
  "user_id": "uuid-here",
  "ip_address": "192.168.1.1"
}
```

### Log Collection with Loki

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./backend/logs:/var/log/restaurant:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

### Promtail Configuration

```yaml
# monitoring/promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: restaurant-backend
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend
          __path__: /var/log/restaurant/*.log

  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*.log
```

---

## Performance Monitoring

### Application Performance Monitoring (APM)

#### Django Silk (Development/Debugging)

```python
# settings.py (DEBUG only)
INSTALLED_APPS += ['silk']
MIDDLEWARE = ['silk.middleware.SilkyMiddleware'] + MIDDLEWARE
```

Access at: `/silk/`

#### Sentry Integration

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
)
```

### Database Query Monitoring

```bash
# Enable query logging temporarily
# Add to settings.py:
# LOGGING['loggers']['django.db.backends'] = {'level': 'DEBUG', 'handlers': ['console']}

# Or use pg_stat_statements
docker compose exec db psql -U restaurant -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

### Slow Query Log

```sql
-- Enable in PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = '1000';  -- Log queries > 1s
SELECT pg_reload_conf();
```

---

## Uptime Monitoring

### External Monitoring Services

#### UptimeRobot Configuration

```yaml
Monitors:
  - Name: Restaurant Website
    URL: https://your-domain.com
    Type: HTTP(s)
    Interval: 5 minutes
    
  - Name: Restaurant API
    URL: https://api.your-domain.com/api/health/
    Type: HTTP(s)
    Expected Status: 200
    
  - Name: Restaurant SSL
    URL: https://your-domain.com
    Type: Keyword
    Keyword: "valid"
    Port: 443
```

#### Pingdom Configuration

```yaml
Checks:
  - Name: Homepage
    URL: https://your-domain.com
    Resolution: 1 minute
    
  - Name: API Health
    URL: https://api.your-domain.com/api/health/
    Resolution: 1 minute
    
  - Name: Transaction: Create Reservation
    Type: Transaction
    Steps:
      - GET https://api.your-domain.com/api/v1/reservations/availability/?date=2026-02-01
      - POST https://api.your-domain.com/api/v1/reservations/
```

### Self-Hosted Uptime Monitoring

```yaml
# docker-compose.monitoring.yml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    ports:
      - "3001:3001"
    volumes:
      - uptime-kuma-data:/app/data
```

---

## Alerting Configuration

### Alertmanager Configuration

```yaml
# monitoring/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@your-domain.com'
  smtp_auth_username: 'alerts@your-domain.com'
  smtp_auth_password: 'app-password'

route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'email'

receivers:
  - name: 'default'
    email_configs:
      - to: 'oncall@your-domain.com'

  - name: 'email'
    email_configs:
      - to: 'team@your-domain.com'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<pagerduty-integration-key>'
```

### Prometheus Alert Rules

```yaml
# monitoring/alert-rules.yml
groups:
  - name: restaurant-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      # High latency
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "99th percentile latency is {{ $value }}s"

      # Database connections high
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database connections high"
          description: "{{ $value }} active connections"

      # Disk space low
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space low"
          description: "{{ $labels.device }} has less than 10% free"

      # Memory usage high
      - alert: MemoryUsageHigh
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memory usage high"
          description: "Memory usage is above 90%"

      # Failed login attempts
      - alert: FailedLoginAttempts
        expr: rate(failed_login_attempts_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of failed logins"
          description: "{{ $value }} failed logins per second"

      # SSL certificate expiry
      - alert: SSLCertificateExpiring
        expr: (ssl_certificate_expiry_timestamp - time()) / 86400 < 7
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "Certificate expires in {{ $value }} days"

      # Backup failure
      - alert: BackupFailed
        expr: time() - backup_last_success_timestamp > 86400 * 2
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Backup has not run in 2 days"
```

### Slack Integration

```yaml
# Add to alertmanager.yml receivers
- name: 'slack'
  slack_configs:
    - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
      channel: '#alerts'
      title: '{{ .GroupLabels.alertname }}'
      text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Dashboard Setup

### Grafana Dashboards

#### System Overview Dashboard

```json
{
  "dashboard": {
    "title": "Restaurant Platform - System Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ status }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p99 latency"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ],
        "type": "stat"
      },
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU %"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory %"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Active connections"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

#### Business Metrics Dashboard

```json
{
  "dashboard": {
    "title": "Restaurant Platform - Business Metrics",
    "panels": [
      {
        "title": "Reservations Today",
        "targets": [
          {
            "expr": "increase(reservations_created_total[1d])",
            "legendFormat": "Created"
          },
          {
            "expr": "increase(reservations_cancelled_total[1d])",
            "legendFormat": "Cancelled"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "active_users_total",
            "legendFormat": "Active users"
          }
        ]
      }
    ]
  }
}
```

### Docker Compose for Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    environment:
      - DATA_SOURCE_NAME=postgresql://restaurant:password@db:5432/restaurant?sslmode=disable

  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      - REDIS_ADDR=redis:6379

volumes:
  prometheus-data:
  alertmanager-data:
  grafana-data:
```

---

## Quick Reference

```bash
# Check application health
curl -s https://api.your-domain.com/api/health/ | jq .

# View recent logs
docker compose logs --tail=100 backend

# Check metrics endpoint
curl -s http://localhost:8000/metrics

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq .

# Trigger test alert
curl -X POST http://localhost:9093/-/reload

# Check alert status
curl -s http://localhost:9090/api/v1/alerts | jq .
```

### Useful Queries

```promql
# Request rate by status
sum(rate(http_requests_total[5m])) by (status)

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Database query rate
sum(rate(pg_stat_database_xact_commit[5m]))

# Cache hit rate
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)
```

---

*Last Updated: 2026-01-31*
*Version: 1.0.0*
