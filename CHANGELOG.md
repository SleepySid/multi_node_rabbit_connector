# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2025-11-26

### Added

- **Manual Acknowledgment Mode**: New `manualAck` option for `consume()` method
  - Provides `ack()`, `nack()`, and `reject()` functions in callback
  - Full control over message acknowledgment timing
  - Supports conditional acknowledgment based on processing results
- **New Queue Operations**:
  - `sendToQueue()` - Send messages directly to a queue (bypassing exchanges)
  - `get()` - Pull a single message from a queue synchronously
  - `deleteQueue()` - Delete a queue with optional conditions
  - `purgeQueue()` - Remove all messages from a queue
  - `unbindQueue()` - Unbind a queue from an exchange
- **New Exchange Operations**:
  - `deleteExchange()` - Delete an exchange with optional conditions
- **New Consumer Operations**:
  - `cancel()` - Cancel a consumer by its consumer tag
  - `prefetch()` - Dynamically set prefetch count (QoS)
- **Direct Message Acknowledgment**:
  - `ack()` - Acknowledge a message directly
  - `nack()` - Negative acknowledge with requeue option
  - `reject()` - Reject a message (send to DLQ)
- New exported types: `MessageActions`, `ConsumeOptions`, `ConsumeCallback`

### Changed

- `consume()` callback signature now includes optional `actions` parameter
- Improved TypeScript type definitions for consume options

## [0.2.0] - 2025-11-26

### Changed

- **BREAKING**: Removed SharedRabbitMQClient pattern - users now create and manage RabbitMQClient instances directly
- Simplified API - just import `RabbitMQClient` and create instances as needed
- Updated README with streamlined Quick Start guide

### Removed

- `initializeSharedClient()`, `getSharedClient()`, `closeSharedClient()`, `isSharedClientInitialized()` exports
- `SharedClientConfig` type
- `docs/SHARED_CLIENT.md` documentation
- `examples/shared-client-usage.ts` example

## [0.1.0] - 2025-11-26

### Added

- Initial public release of RabbitMQ Multi-Node Connector
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

[Unreleased]: https://github.com/SleepySid/multi_node_rabbit_connector/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/SleepySid/multi_node_rabbit_connector/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SleepySid/multi_node_rabbit_connector/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/SleepySid/multi_node_rabbit_connector/releases/tag/v0.1.0
