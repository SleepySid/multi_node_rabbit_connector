/**
 * Cluster Configuration Example
 * 
 * This example demonstrates how to configure the client for
 * multi-node RabbitMQ cluster with automatic failover.
 */

import RabbitMQClient from '../src/rabbit.js';

async function main() {
  // Create a client with cluster configuration
  const client = new RabbitMQClient({
    // Multiple RabbitMQ cluster nodes
    urls: [
      'amqp://user:password@node1.rabbitmq.example.com:5672',
      'amqp://user:password@node2.rabbitmq.example.com:5672',
      'amqp://user:password@node3.rabbitmq.example.com:5672',
    ],
    
    connectionName: 'cluster-example',
    heartbeat: 60,
    
    // Failover strategy: 'round-robin' or 'random'
    failoverStrategy: 'round-robin',
    
    // Connection settings
    reconnectDelay: 5000,
    maxReconnectAttempts: -1,
    exponentialBackoff: true,
    connectionTimeout: 30000,
    
    // Channel pool configuration
    poolConfig: {
      maxChannels: 20,
      acquireTimeout: 5000,
    },
    
    // Circuit breaker configuration
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
    },
    
    // Cluster-specific options
    clusterOptions: {
      retryConnectTimeout: 5000,
      nodeRecoveryInterval: 30000,
      shuffleNodes: true,
      priorityNodes: ['amqp://user:password@node1.rabbitmq.example.com:5672'], // Try this node first
    },
    
    // Channel recovery options
    channelOptions: {
      maxRetries: 3,
      retryDelay: 1000,
      autoRecovery: true,
    },
  });

  // Monitor cluster events
  client.on('connected', () => {
    console.log('✅ Connected to cluster');
  });

  client.on('connectionError', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  client.on('reconnecting', () => {
    console.log('🔄 Reconnecting to cluster...');
  });

  client.on('reconnected', () => {
    console.log('✅ Reconnected to cluster');
  });

  client.on('blocked', (reason) => {
    console.warn('⚠️  Connection blocked:', reason);
  });

  client.on('unblocked', () => {
    console.log('✅ Connection unblocked');
  });

  client.on('metrics', (metrics) => {
    console.log('📊 Metrics:', {
      sent: metrics.messagesSent,
      received: metrics.messagesReceived,
      errors: metrics.errors,
      reconnections: metrics.reconnections,
    });
  });

  try {
    // Connect to cluster
    await client.connect();
    console.log('🎯 Connected to RabbitMQ cluster\n');

    // Perform operations
    await client.assertExchange('cluster-test', 'topic', { durable: true });
    await client.assertQueue('cluster-queue', { durable: true });
    await client.bindQueue('cluster-queue', 'cluster-test', 'test.#');

    // Publish test messages
    for (let i = 1; i <= 5; i++) {
      await client.publish(
        'cluster-test',
        'test.message',
        Buffer.from(`Cluster message ${i}`),
        { persistent: true }
      );
      console.log(`✉️  Published message ${i}`);
    }

    // Perform health check
    const isHealthy = await client.healthCheck();
    console.log('\n🏥 Health Check:', isHealthy ? 'PASSED' : 'FAILED');

    // Get metrics
    const metrics = client.getMetrics();
    console.log('\n📈 Final Metrics:', metrics);

    // Graceful shutdown
    await client.gracefulShutdown();
    console.log('\n👋 Disconnected from cluster');
    
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

main();

