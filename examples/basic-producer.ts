/**
 * Basic Producer Example
 * 
 * This example demonstrates how to set up a simple message producer
 * using the RabbitMQ Multi-Node Connector.
 */

import RabbitMQClient from '../src/rabbit.js';

async function main() {
  // Create a new RabbitMQ client
  const client = new RabbitMQClient({
    urls: ['amqp://localhost:5672'],
    connectionName: 'basic-producer',
    heartbeat: 60,
    prefetchCount: 10,
    reconnectDelay: 5000,
    maxReconnectAttempts: -1, // Unlimited retries
    exponentialBackoff: true,
  });

  // Register event listeners
  client.on('connected', () => {
    console.log('✅ Connected to RabbitMQ');
  });

  client.on('connectionError', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  client.on('reconnecting', () => {
    console.log('🔄 Attempting to reconnect...');
  });

  client.on('metrics', (metrics) => {
    console.log('📊 Metrics:', metrics);
  });

  try {
    // Connect to RabbitMQ
    await client.connect();

    // Create exchange
    await client.assertExchange('events', 'topic', { durable: true });

    // Publish messages
    for (let i = 1; i <= 10; i++) {
      const message = {
        id: i,
        event: 'user.created',
        data: {
          userId: 1000 + i,
          username: `user${i}`,
          email: `user${i}@example.com`,
        },
        timestamp: new Date().toISOString(),
      };

      await client.publish(
        'events',
        'user.created',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      console.log(`✉️  Published message ${i}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Get final metrics
    const metrics = client.getMetrics();
    console.log('\n📈 Final Metrics:', metrics);

    // Graceful shutdown
    await client.gracefulShutdown();
    console.log('👋 Disconnected gracefully');
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

main();

