# RabbitMQ Multi-Node Connector

[![npm version](https://badge.fury.io/js/%40your-scope%2Frabbitmq-connector.svg)](https://www.npmjs.com/package/@your-scope/rabbitmq-connector)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust, production-ready RabbitMQ client for Node.js and TypeScript with advanced features including connection pooling, circuit breaker pattern, cluster failover, and comprehensive monitoring.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Core Algorithms](#core-algorithms)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Monitoring & Metrics](#monitoring--metrics)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Features

- **Automatic Reconnection** with exponential backoff
- **Connection Pooling** for optimal resource utilization
- **Circuit Breaker Pattern** for fault tolerance
- **Cluster Support** with intelligent failover
- **Real-time Metrics** and health monitoring
- **SSL/TLS Support** for secure connections
- **Message Batching** for improved throughput
- **Channel Recovery** with automatic healing
- **Comprehensive Logging** with structured data
- **Full TypeScript Support** with type definitions
- **Event-Driven Architecture** with comprehensive events

## Installation

```bash
# Using npm
npm install @your-scope/rabbitmq-connector

# Using yarn
yarn add @your-scope/rabbitmq-connector

# Using pnpm
pnpm add @your-scope/rabbitmq-connector
```

**Requirements:**

- Node.js >= 18.0.0
- TypeScript >= 5.0 (optional, for TypeScript projects)

## Quick Start

### Option 1: Shared Client (Recommended for Single Connection)

Use this pattern when you want **one connection shared across your entire application**.

```typescript
import { initializeSharedClient, getSharedClient, closeSharedClient } from '@your-scope/rabbitmq-connector';

// 1. Initialize ONCE at application startup
await initializeSharedClient({
  urls: ['amqp://localhost:5672'],
  connectionName: 'my-app',
  poolConfig: {
    maxChannels: 50, // Large pool for shared usage
    acquireTimeout: 5000,
  },
});

// 2. Use in ANY module/service
const client = getSharedClient();
await client.publish('my-exchange', 'routing.key', Buffer.from('Hello World'));

// 3. Cleanup on shutdown
process.on('SIGINT', async () => {
  await closeSharedClient();
  process.exit(0);
});
```

📖 **[Read the Shared Client Guide](./docs/SHARED_CLIENT.md)** for complete examples.

### Option 2: Multiple Instances

Use this pattern when you need **multiple independent connections**.

```typescript
import RabbitMQClient from '@your-scope/rabbitmq-connector';

// Basic configuration
const client = new RabbitMQClient({
  urls: ['amqp://localhost:5672'],
  connectionName: 'my-app-connection',
  prefetchCount: 10,
});

// Connect to RabbitMQ
await client.connect();

// Publish a message
await client.publish('my-exchange', 'routing.key', Buffer.from('Hello World'));

// Consume messages
const consumerTag = await client.consume('my-queue', async (msg) => {
  if (msg) {
    console.log('Received:', msg.content.toString());
  }
});

// Graceful shutdown
await client.gracefulShutdown();
```

### CommonJS

```javascript
const RabbitMQClient = require('@your-scope/rabbitmq-connector').default;

// Same usage as above
```

## Configuration

### Basic Configuration

```typescript
interface RabbitMQOptions {
  url?: string | Options.Connect;
  heartbeat?: number; // Connection heartbeat (1-60 seconds)
  connectionName?: string; // For debugging/monitoring
  prefetchCount?: number; // Messages to prefetch per channel
  prefetchGlobal?: boolean; // Global prefetch setting
  reconnectDelay?: number; // Base reconnection delay (ms)
  maxReconnectAttempts?: number; // Max reconnection attempts (-1 = infinite)
  exponentialBackoff?: boolean; // Use exponential backoff
  connectionTimeout?: number; // Connection timeout (ms)
  vhost?: string; // Virtual host
}
```

### Advanced Configuration

```typescript
const client = new RabbitMQClient({
  // Cluster configuration
  urls: [
    'amqp://node1.rabbitmq.local:5672',
    'amqp://node2.rabbitmq.local:5672',
    'amqp://node3.rabbitmq.local:5672',
  ],
  failoverStrategy: 'round-robin', // or 'random'

  // Connection pooling
  poolConfig: {
    maxChannels: 20,
    acquireTimeout: 5000,
  },

  // Circuit breaker
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },

  // Message batching
  batchConfig: {
    size: 100,
    timeoutMs: 1000,
  },

  // SSL/TLS
  ssl: {
    enabled: true,
    validate: true,
    ca: ['path/to/ca.pem'],
    cert: 'path/to/cert.pem',
    key: 'path/to/key.pem',
  },

  // Cluster options
  clusterOptions: {
    retryConnectTimeout: 5000,
    nodeRecoveryInterval: 30000,
    shuffleNodes: true,
    priorityNodes: ['amqp://primary.rabbitmq.local:5672'],
  },

  // Channel recovery
  channelOptions: {
    maxRetries: 3,
    retryDelay: 1000,
    autoRecovery: true,
  },
});
```

## Core Algorithms

### 1. Exponential Backoff Reconnection

The client implements an intelligent reconnection strategy with exponential backoff and jitter:

```typescript
private calculateReconnectDelay(): number {
  const baseDelay = this.options.reconnectDelay || 1000;
  const maxDelay = 60000; // 1 minute max

  if (!this.options.exponentialBackoff) {
    return baseDelay;
  }

  // Exponential backoff: delay = baseDelay * 2^attempts
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, this.reconnectAttempts),
    maxDelay
  );

  // Add jitter (±20%) to prevent thundering herd
  const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.max(baseDelay, Math.min(exponentialDelay + jitter, maxDelay));
}
```

**Algorithm Benefits:**

- Prevents overwhelming the broker during outages
- Reduces connection storms in distributed systems
- Adaptive delay based on failure frequency

### 2. Circuit Breaker Pattern

Protects against cascading failures by monitoring error rates:

```typescript
// Circuit breaker states: CLOSED → OPEN → HALF_OPEN → CLOSED
private circuitBreaker = {
  failures: 0,
  isOpen: false,
  lastFailure: null as Date | null,
};

// Opens circuit when failure threshold is reached
private handleConnectionError(error: unknown, reject: (error: Error) => void): void {
  this.circuitBreaker.failures++;
  this.circuitBreaker.isOpen =
    this.circuitBreaker.failures >= (this.options.circuitBreaker?.failureThreshold ?? 5);
  this.circuitBreaker.lastFailure = new Date();
}
```

**States:**

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Failures exceed threshold, requests fail fast
- **HALF_OPEN**: Testing if service has recovered

### 3. Channel Pool Management

Efficient channel reuse with automatic cleanup:

```typescript
interface ChannelPool {
  channels: (Channel | ConfirmChannel)[];
  maxChannels: number;
  inUse: Set<Channel | ConfirmChannel>;
}

public async getChannel(): Promise<Channel | ConfirmChannel> {
  // 1. Try to get available channel from pool
  const availableChannel = this.channelPool.channels.find(
    (ch) => !this.channelPool.inUse.has(ch) && this.isChannelOpen(ch)
  );

  if (availableChannel) {
    this.channelPool.inUse.add(availableChannel);
    return availableChannel;
  }

  // 2. Create new channel if under limit
  if (this.channelPool.channels.length < this.channelPool.maxChannels) {
    const newChannel = await this.connection.createConfirmChannel();
    this.channelPool.channels.push(newChannel);
    this.channelPool.inUse.add(newChannel);
    return newChannel;
  }

  // 3. Wait for channel to become available
  return this.waitForAvailableChannel();
}
```

### 4. Cluster Failover Strategy

Intelligent node selection with health tracking:

```typescript
private getSortedNodes(nodes: string[]): string[] {
  const { failoverStrategy, clusterOptions } = this.options;

  // 1. Priority nodes first
  const priorityNodes = clusterOptions?.priorityNodes || [];
  let sortedNodes = [
    ...priorityNodes.filter(node => nodes.includes(node)),
    ...nodes.filter(node => !priorityNodes.includes(node))
  ];

  // 2. Apply failover strategy
  if (failoverStrategy === 'random') {
    sortedNodes = sortedNodes.sort(() => Math.random() - 0.5);
  } else if (failoverStrategy === 'round-robin') {
    const rotateAmount = this.currentUrlIndex % sortedNodes.length;
    sortedNodes = [
      ...sortedNodes.slice(rotateAmount),
      ...sortedNodes.slice(0, rotateAmount)
    ];
    this.currentUrlIndex++;
  }

  return sortedNodes;
}
```

## API Reference

### Connection Management

#### `connect(): Promise<void>`

Establishes connection to RabbitMQ with automatic retry logic.

```typescript
await client.connect();
```

#### `close(): Promise<void>`

Closes all channels and connection immediately.

```typescript
await client.close();
```

#### `gracefulShutdown(): Promise<void>`

Performs graceful shutdown waiting for in-flight messages.

```typescript
await client.gracefulShutdown();
```

### Message Operations

#### `publish(exchange, routingKey, content, options): Promise<void>`

Publishes a single message with confirmation.

```typescript
await client.publish('user-events', 'user.created', Buffer.from(JSON.stringify({ userId: 123 })), {
  persistent: true,
  timestamp: Date.now(),
});
```

#### `publishBatch(messages): Promise<void>`

Publishes multiple messages in a single operation.

```typescript
const messages = [
  {
    exchange: 'events',
    routingKey: 'user.created',
    content: Buffer.from('{"userId": 1}'),
    options: { persistent: true },
  },
  {
    exchange: 'events',
    routingKey: 'user.updated',
    content: Buffer.from('{"userId": 2}'),
    options: { persistent: true },
  },
];

await client.publishBatch(messages);
```

#### `consume(queue, onMessage, options): Promise<string>`

Consumes messages from a queue with automatic acknowledgment.

```typescript
const consumerTag = await client.consume(
  'user-processing-queue',
  async (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());
      await processUser(data);
    }
  },
  {
    noAck: false,
    timeout: 30000, // Message processing timeout
  },
);
```

### Queue and Exchange Management

#### `assertQueue(queue, options): Promise<AssertQueue>`

Creates or verifies a queue exists.

```typescript
await client.assertQueue('user-events', {
  durable: true,
  deadLetterExchange: 'dlx',
  deadLetterRoutingKey: 'failed',
  messageTtl: 3600000, // 1 hour
  maxLength: 10000,
});
```

#### `assertExchange(exchange, type, options): Promise<AssertExchange>`

Creates or verifies an exchange exists.

```typescript
await client.assertExchange('user-events', 'topic', {
  durable: true,
  alternateExchange: 'unrouted-messages',
});
```

#### `bindQueue(queue, exchange, pattern): Promise<void>`

Binds a queue to an exchange with a routing pattern.

```typescript
await client.bindQueue('user-notifications', 'user-events', 'user.*.created');
```

### Health and Monitoring

#### `healthCheck(): Promise<boolean>`

Performs a comprehensive health check.

```typescript
const isHealthy = await client.healthCheck();
if (!isHealthy) {
  console.log('RabbitMQ connection is unhealthy');
}
```

#### `getMetrics(): Metrics`

Returns current performance metrics.

```typescript
const metrics = client.getMetrics();
console.log(`Messages sent: ${metrics.messagesSent}`);
console.log(`Messages received: ${metrics.messagesReceived}`);
console.log(`Errors: ${metrics.errors}`);
console.log(`Reconnections: ${metrics.reconnections}`);
```

## Examples

### Basic Producer

```typescript
import RabbitMQClient from '@your-scope/rabbitmq-connector';

class UserEventProducer {
  private client: RabbitMQClient;

  constructor() {
    this.client = new RabbitMQClient({
      urls: ['amqp://localhost:5672'],
      connectionName: 'user-event-producer',
      prefetchCount: 1,
    });
  }

  async initialize() {
    await this.client.connect();
    await this.client.assertExchange('user-events', 'topic', { durable: true });
  }

  async publishUserCreated(userId: number, userData: any) {
    const event = {
      type: 'user.created',
      userId,
      data: userData,
      timestamp: new Date().toISOString(),
    };

    await this.client.publish('user-events', 'user.created', Buffer.from(JSON.stringify(event)), {
      persistent: true,
    });
  }

  async shutdown() {
    await this.client.gracefulShutdown();
  }
}
```

### Basic Consumer

```typescript
class UserEventConsumer {
  private client: RabbitMQClient;

  constructor() {
    this.client = new RabbitMQClient({
      urls: ['amqp://localhost:5672'],
      connectionName: 'user-event-consumer',
      prefetchCount: 10,
    });
  }

  async initialize() {
    await this.client.connect();

    // Setup infrastructure
    await this.client.assertExchange('user-events', 'topic', { durable: true });
    await this.client.assertQueue('user-processing', {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'failed',
    });
    await this.client.bindQueue('user-processing', 'user-events', 'user.*');
  }

  async startConsuming() {
    await this.client.consume('user-processing', async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          await this.processUserEvent(event);
        } catch (error) {
          console.error('Error processing message:', error);
          throw error; // Will trigger nack and requeue
        }
      }
    });
  }

  private async processUserEvent(event: any) {
    console.log(`Processing event: ${event.type} for user ${event.userId}`);
    // Your business logic here
  }
}
```

### Cluster Configuration

```typescript
const clusterClient = new RabbitMQClient({
  urls: [
    'amqp://rabbit1.example.com:5672',
    'amqp://rabbit2.example.com:5672',
    'amqp://rabbit3.example.com:5672',
  ],
  failoverStrategy: 'round-robin',
  clusterOptions: {
    retryConnectTimeout: 5000,
    nodeRecoveryInterval: 30000,
    priorityNodes: ['amqp://rabbit1.example.com:5672'],
  },
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeout: 60000,
  },
});
```

### SSL/TLS Configuration

```typescript
import fs from 'fs';

const secureClient = new RabbitMQClient({
  urls: ['amqps://secure-rabbit.example.com:5671'],
  ssl: {
    enabled: true,
    validate: true,
    ca: [fs.readFileSync('ca-cert.pem').toString()],
    cert: fs.readFileSync('client-cert.pem').toString(),
    key: fs.readFileSync('client-key.pem').toString(),
    passphrase: 'your-key-passphrase',
  },
});
```

### Message Batching

```typescript
class BatchProcessor {
  private client: RabbitMQClient;

  constructor() {
    this.client = new RabbitMQClient({
      urls: ['amqp://localhost:5672'],
      batchConfig: {
        size: 50, // Batch size
        timeoutMs: 1000, // Max wait time
      },
    });
  }

  async processBulkUsers(users: any[]) {
    const messages = users.map((user) => ({
      exchange: 'user-events',
      routingKey: 'user.bulk.created',
      content: Buffer.from(JSON.stringify(user)),
      options: { persistent: true },
    }));

    await this.client.publishBatch(messages);
  }
}
```

## Monitoring & Metrics

### Event Listeners

```typescript
client.on('connected', () => {
  console.log('Connected to RabbitMQ');
});

client.on('connectionError', (error) => {
  console.error('Connection error:', error);
});

client.on('reconnecting', () => {
  console.log('Attempting to reconnect...');
});

client.on('reconnected', () => {
  console.log('Successfully reconnected');
});

client.on('metrics', (metrics) => {
  console.log('Current metrics:', metrics);
});

client.on('blocked', (reason) => {
  console.warn('Connection blocked:', reason);
});

client.on('unblocked', () => {
  console.log('Connection unblocked');
});
```

### Metrics Collection

```typescript
// Get current metrics
const metrics = client.getMetrics();

// Metrics structure
interface Metrics {
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  reconnections: number;
  lastReconnectTime: Date | null;
  avgProcessingTime: number;
}
```

## Error Handling

### Automatic Error Recovery

The client automatically handles various error scenarios:

1. **Connection Errors**: Automatic reconnection with exponential backoff
2. **Channel Errors**: Channel recovery and recreation
3. **Message Processing Errors**: Automatic nack and requeue
4. **Cluster Node Failures**: Failover to healthy nodes

### Custom Error Handling

```typescript
client.on('error', (error) => {
  // Log error to monitoring system
  logger.error('RabbitMQ error:', error);

  // Send alert if critical
  if (error.message.includes('ECONNREFUSED')) {
    alerting.sendAlert('RabbitMQ connection failed');
  }
});

// Handle specific message processing errors
await client.consume('my-queue', async (msg) => {
  try {
    await processMessage(msg);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Don't requeue invalid messages
      return; // Auto-ack
    }
    throw error; // Requeue for retry
  }
});
```

## Best Practices

### 1. Connection Management

```typescript
// Good: Single connection per application
const client = new RabbitMQClient({ url: 'amqp://localhost' });

// Bad: Multiple connections
const client1 = new RabbitMQClient({ url: 'amqp://localhost' });
const client2 = new RabbitMQClient({ url: 'amqp://localhost' });
```

### 2. Channel Usage

```typescript
// Good: Use channel pool
const channel = await client.getChannel();
try {
  // Use channel
} finally {
  client.releaseChannel(channel);
}

// Better: Use built-in methods
await client.publish('exchange', 'key', buffer);
```

### 3. Error Handling

```typescript
// Good: Comprehensive error handling
client.on('error', (error) => {
  logger.error('RabbitMQ error:', error);
  metrics.increment('rabbitmq.errors');
});

client.on('reconnected', () => {
  logger.info('RabbitMQ reconnected');
  metrics.increment('rabbitmq.reconnections');
});
```

### 4. Graceful Shutdown

```typescript
// Good: Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await client.gracefulShutdown();
  process.exit(0);
});
```

### 5. Message Durability

```typescript
// Good: Durable queues and persistent messages
await client.assertQueue('important-queue', { durable: true });
await client.publish('exchange', 'key', buffer, { persistent: true });
```

### 6. Monitoring

```typescript
// Good: Regular health checks
setInterval(async () => {
  const isHealthy = await client.healthCheck();
  if (!isHealthy) {
    logger.warn('RabbitMQ health check failed');
  }
}, 30000);
```

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the linter and tests (`npm run lint && npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Publishing

```bash
# Update version (patch/minor/major)
npm version patch

# Build and publish
npm publish
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**SID**

## Support

For issues and questions:

- [Create an issue on GitHub](https://github.com/yourusername/rabbitmq-connector/issues)
- Check the [documentation](https://github.com/yourusername/rabbitmq-connector#readme)
- Review the [examples](./examples/)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

---

Made for the Node.js community
