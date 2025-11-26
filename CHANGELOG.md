# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-XX

### Added
- Initial release of RabbitMQ Multi-Node Connector
- Connection pooling with configurable pool size
- Circuit breaker pattern for fault tolerance
- Multi-node cluster support with intelligent failover
- Exponential backoff reconnection strategy with jitter
- Comprehensive event system (14+ event types)
- Real-time metrics and health monitoring
- SSL/TLS support for secure connections
- Message batching for improved throughput
- Automatic channel recovery
- Graceful shutdown with in-flight message handling
- Structured logging with OpenTelemetry integration
- TypeScript support with full type definitions
- Queue and exchange management helpers
- Dead letter exchange support
- Message TTL and priority configuration

### Features
- **Connection Management**: Auto-reconnection, heartbeat, timeout control
- **Channel Pooling**: Up to configurable channels with automatic reuse
- **Cluster Support**: Round-robin and random failover strategies
- **Observability**: Metrics emission, event listeners, structured logs
- **Reliability**: Circuit breaker, exponential backoff, health checks

[Unreleased]: https://github.com/yourusername/rabbitmq-connector/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/rabbitmq-connector/releases/tag/v1.0.0

