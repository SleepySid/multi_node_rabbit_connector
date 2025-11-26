# Examples

This directory contains practical examples demonstrating various features of the RabbitMQ Multi-Node Connector.

## Prerequisites

Before running the examples, ensure you have:

1. RabbitMQ server running (default: `localhost:5672`)
2. Node.js 18+ installed
3. Dependencies installed: `npm install`

## Running Examples

### Basic Producer

Demonstrates simple message publishing:

```bash
npx tsx examples/basic-producer.ts
```

### Basic Consumer

Demonstrates message consumption with automatic acknowledgment:

```bash
npx tsx examples/basic-consumer.ts
```

### Cluster Example

Shows multi-node cluster configuration with failover:

```bash
npx tsx examples/cluster-example.ts
```

**Note:** This requires multiple RabbitMQ nodes. To test locally:
```bash
# Run multiple RabbitMQ instances or use Docker Compose
docker-compose up -d
```

### Batch Publishing

Demonstrates high-throughput batch publishing:

```bash
npx tsx examples/batch-publishing.ts
```

## Example Workflow

1. **Start RabbitMQ:**
   ```bash
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

2. **Run the consumer** (in one terminal):
   ```bash
   npx tsx examples/basic-consumer.ts
   ```

3. **Run the producer** (in another terminal):
   ```bash
   npx tsx examples/basic-producer.ts
   ```

4. **Monitor** the RabbitMQ management UI at http://localhost:15672 (guest/guest)

## Features Demonstrated

| Example | Features |
|---------|----------|
| `basic-producer.ts` | Connection, publishing, events, graceful shutdown |
| `basic-consumer.ts` | Consuming, error handling, dead letter exchange |
| `cluster-example.ts` | Cluster failover, circuit breaker, health checks |
| `batch-publishing.ts` | Batch operations, high throughput |

## Next Steps

- Explore the main [README](../README.md) for comprehensive API documentation
- Check out advanced configuration options
- Learn about monitoring and metrics

