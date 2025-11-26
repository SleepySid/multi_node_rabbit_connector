# Shared Client Pattern

This guide explains how to use a **single shared RabbitMQ connection** throughout your entire application.

## Why Use a Shared Client?

- ✅ **Single Connection**: One connection shared across all modules
- ✅ **Resource Efficient**: Reduces connection overhead
- ✅ **Centralized Configuration**: Configure once, use everywhere
- ✅ **Built-in Channel Pooling**: Automatically manages channels for concurrent operations
- ✅ **Automatic Reconnection**: All modules benefit from reconnection logic

## Quick Start

### 1. Initialize at Application Startup

```typescript
import { initializeSharedClient } from '@your-scope/rabbitmq-connector';

// In your main app.ts or index.ts
await initializeSharedClient({
  urls: ['amqp://localhost:5672'],
  connectionName: 'my-app',
  poolConfig: {
    maxChannels: 50, // Large pool for shared usage
    acquireTimeout: 5000,
  },
});
```

### 2. Use in Any Module

```typescript
import { getSharedClient } from '@your-scope/rabbitmq-connector';

// In any service/module
export class UserService {
  async createUser(userData: any) {
    const client = getSharedClient();
    
    await client.publish(
      'user-events',
      'user.created',
      Buffer.from(JSON.stringify(userData))
    );
  }
}
```

### 3. Cleanup on Shutdown

```typescript
import { closeSharedClient } from '@your-scope/rabbitmq-connector';

process.on('SIGINT', async () => {
  await closeSharedClient();
  process.exit(0);
});
```

## Complete Example

```typescript
// app.ts - Main application entry point
import {
  initializeSharedClient,
  getSharedClient,
  closeSharedClient,
} from '@your-scope/rabbitmq-connector';

async function main() {
  // 1. Initialize ONCE at startup
  await initializeSharedClient({
    urls: [
      'amqp://node1:5672',
      'amqp://node2:5672',
      'amqp://node3:5672',
    ],
    connectionName: 'my-app',
    poolConfig: {
      maxChannels: 50,
      acquireTimeout: 5000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  });

  // 2. Use in your application
  const userService = new UserService();
  const orderService = new OrderService();
  
  await userService.createUser({ name: 'John' });
  await orderService.createOrder({ items: ['item1'] });

  // 3. Graceful shutdown
  process.on('SIGINT', async () => {
    await closeSharedClient();
    process.exit(0);
  });
}

main();
```

```typescript
// services/user-service.ts
import { getSharedClient } from '@your-scope/rabbitmq-connector';

export class UserService {
  async createUser(userData: any) {
    // Get the shared connection
    const client = getSharedClient();
    
    await client.publish(
      'user-events',
      'user.created',
      Buffer.from(JSON.stringify(userData)),
      { persistent: true }
    );
  }
}
```

```typescript
// services/order-service.ts
import { getSharedClient } from '@your-scope/rabbitmq-connector';

export class OrderService {
  async createOrder(orderData: any) {
    // Same shared connection as UserService
    const client = getSharedClient();
    
    await client.publish(
      'order-events',
      'order.created',
      Buffer.from(JSON.stringify(orderData)),
      { persistent: true }
    );
  }
}
```

## API Reference

### `initializeSharedClient(config)`

Initialize the shared RabbitMQ client. Call this **once** at application startup.

**Parameters:**
- `config.urls` - Array of RabbitMQ cluster URLs
- `config.connectionName` - Connection name for identification
- `config.poolConfig` - Channel pool configuration
  - `maxChannels` - Maximum channels (recommended: 50+ for shared usage)
  - `acquireTimeout` - Timeout for acquiring a channel
- `config.circuitBreaker` - Circuit breaker settings
- `config.ssl` - SSL/TLS configuration
- See `SharedClientConfig` for all options

**Returns:** `Promise<RabbitMQClient>`

### `getSharedClient()`

Get the shared RabbitMQ client instance. Use this in any module.

**Returns:** `RabbitMQClient`

**Throws:** Error if client not initialized

### `closeSharedClient()`

Close the shared RabbitMQ client. Call this at application shutdown.

**Returns:** `Promise<void>`

### `isSharedClientInitialized()`

Check if the shared client is initialized.

**Returns:** `boolean`

## Best Practices

### ✅ DO

- Initialize the shared client **once** at application startup
- Use `getSharedClient()` in all modules that need RabbitMQ
- Set `maxChannels` to a high value (50+) for concurrent operations
- Close the shared client on graceful shutdown
- Handle SIGINT and SIGTERM for cleanup

### ❌ DON'T

- Don't call `initializeSharedClient()` multiple times
- Don't create new `RabbitMQClient` instances if using shared client
- Don't forget to close the client on shutdown
- Don't use a small `maxChannels` value for shared usage

## Configuration Recommendations

For shared client usage:

```typescript
{
  poolConfig: {
    maxChannels: 50,  // High value for concurrent operations
    acquireTimeout: 5000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },
  maxReconnectAttempts: -1,  // Unlimited retries
  exponentialBackoff: true,
}
```

## Running the Example

```bash
npm run build
node dist/examples/shared-client-usage.js
```

## See Also

- [Main README](../README.md)
- [Examples](../examples/)
- [API Documentation](./API.md)

