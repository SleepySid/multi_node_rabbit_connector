/**
 * Batch Publishing Example
 * 
 * This example demonstrates how to publish messages in batches
 * for improved throughput.
 */

import RabbitMQClient from '../src/rabbit.js';

async function main() {
  const client = new RabbitMQClient({
    urls: ['amqp://ssh-smartship:SvSM&PGxYamart@20.244.52.24:5672'],
    connectionName: 'batch-publisher',
    
    // Batch configuration
    batchConfig: {
      size: 100,
      timeoutMs: 1000,
    },
  });

  client.on('connected', () => {
    console.log('✅ Connected to RabbitMQ');
  });

  try {
    await client.connect();
    await client.assertExchange('batch-events', 'topic', { durable: true });

    // Prepare batch of messages
    const messages = [];
    for (let i = 1; i <= 1000; i++) {
      messages.push({
        exchange: 'batch-events',
        routingKey: 'batch.message',
        content: Buffer.from(JSON.stringify({
          id: i,
          data: `Batch message ${i}`,
          timestamp: Date.now(),
        })),
        options: { persistent: true },
      });
    }

    console.log(`📦 Publishing ${messages.length} messages in batch...\n`);
    const startTime = Date.now();

    // Publish in batch
    await client.publishBatch(messages);

    const duration = Date.now() - startTime;
    console.log(`✅ Published ${messages.length} messages in ${duration}ms`);
    console.log(`📊 Throughput: ${Math.round(messages.length / (duration / 1000))} msg/s`);

    // Get metrics
    const metrics = client.getMetrics();
    console.log('\n📈 Metrics:', metrics);

    await client.gracefulShutdown();
    console.log('\n👋 Disconnected');
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

main();

