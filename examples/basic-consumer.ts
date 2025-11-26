/**
 * Basic Consumer Example
 * 
 * This example demonstrates how to set up a simple message consumer
 * using the RabbitMQ Multi-Node Connector.
 */

import RabbitMQClient from '../src/rabbit.js';

async function main() {
  // Create a new RabbitMQ client
  const client = new RabbitMQClient({
    urls: ['amqp://localhost:5672'],
    connectionName: 'basic-consumer',
    heartbeat: 60,
    prefetchCount: 5,
    reconnectDelay: 5000,
    maxReconnectAttempts: -1,
    exponentialBackoff: true,
  });

  // Register event listeners
  client.on('connected', () => {
    console.log('✅ Connected to RabbitMQ');
  });

  client.on('connectionError', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  client.on('reconnected', () => {
    console.log('🔄 Reconnected to RabbitMQ');
  });

  try {
    // Connect to RabbitMQ
    await client.connect();

    // Setup infrastructure
    await client.assertExchange('events', 'topic', { durable: true });
    
    await client.assertQueue('user-events', {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'failed.user-events',
      messageTtl: 3600000, // 1 hour
    });

    await client.bindQueue('user-events', 'events', 'user.*');

    console.log('🎯 Starting to consume messages...\n');

    // Start consuming messages
    await client.consume(
      'user-events',
      async (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            console.log('📨 Received message:', {
              id: data.id,
              event: data.event,
              userId: data.userId,
              timestamp: data.timestamp,
            });

            // Simulate message processing
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            console.log('✅ Processed message:', data.id);
          } catch (error) {
            console.error('❌ Error processing message:', error);
            throw error; // Will trigger nack and requeue
          }
        }
      },
      { 
        noAck: false,
        timeout: 30000 
      }
    );

    console.log('👂 Consumer is running. Press Ctrl+C to exit.\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await client.gracefulShutdown();
      console.log('👋 Disconnected gracefully');
      process.exit(0);
    });

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

main();

