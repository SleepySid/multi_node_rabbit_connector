/**
 * Shared Client Usage Example
 * 
 * This example demonstrates how to use a single shared RabbitMQ connection
 * across multiple modules in your application.
 */

import {
  initializeSharedClient,
  getSharedClient,
  closeSharedClient,
  isSharedClientInitialized,
} from '../src/shared-client.js';

// ============================================================================
// Module 1: User Service
// ============================================================================
class UserService {
  async createUser(userData: { name: string; email: string }) {
    console.log('📝 UserService: Creating user...', userData);
    
    // Get the shared client - same connection used everywhere
    const client = getSharedClient();
    
    await client.publish(
      'user-events',
      'user.created',
      Buffer.from(JSON.stringify(userData)),
      { persistent: true }
    );
    
    console.log('✅ UserService: User created event published');
  }

  async deleteUser(userId: string) {
    console.log('🗑️  UserService: Deleting user...', userId);
    
    const client = getSharedClient();
    
    await client.publish(
      'user-events',
      'user.deleted',
      Buffer.from(JSON.stringify({ userId })),
      { persistent: true }
    );
    
    console.log('✅ UserService: User deleted event published');
  }
}

// ============================================================================
// Module 2: Order Service
// ============================================================================
class OrderService {
  async createOrder(orderData: { userId: string; items: string[] }) {
    console.log('📦 OrderService: Creating order...', orderData);
    
    // Same shared connection
    const client = getSharedClient();
    
    await client.publish(
      'order-events',
      'order.created',
      Buffer.from(JSON.stringify(orderData)),
      { persistent: true }
    );
    
    console.log('✅ OrderService: Order created event published');
  }

  async processOrder(orderId: string) {
    console.log('⚙️  OrderService: Processing order...', orderId);
    
    const client = getSharedClient();
    
    await client.publish(
      'order-events',
      'order.processed',
      Buffer.from(JSON.stringify({ orderId })),
      { persistent: true }
    );
    
    console.log('✅ OrderService: Order processed event published');
  }
}

// ============================================================================
// Module 3: Notification Service
// ============================================================================
class NotificationService {
  async startListening() {
    console.log('👂 NotificationService: Starting to listen for events...');
    
    // Same shared connection
    const client = getSharedClient();
    
    // Setup infrastructure
    await client.assertExchange('user-events', 'topic', { durable: true });
    await client.assertExchange('order-events', 'topic', { durable: true });
    await client.assertQueue('notifications', { durable: true });
    
    // Bind to multiple events
    await client.bindQueue('notifications', 'user-events', 'user.*');
    await client.bindQueue('notifications', 'order-events', 'order.*');
    
    // Start consuming
    await client.consume('notifications', async (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        console.log('📬 NotificationService: Received event:', {
          routingKey: msg.fields.routingKey,
          content,
        });
        
        // Acknowledge the message
        client.ack(msg);
      }
    });
    
    console.log('✅ NotificationService: Listening for events');
  }
}

// ============================================================================
// Main Application
// ============================================================================
async function main() {
  console.log('🚀 Starting application with shared RabbitMQ client...\n');

  try {
    // ========================================================================
    // STEP 1: Initialize the shared client ONCE at application startup
    // ========================================================================
    await initializeSharedClient({
      urls: [
        'amqp://localhost:5672',
        // Add more cluster nodes for failover
        // 'amqp://user:password@node2.rabbitmq.example.com:5672',
        // 'amqp://user:password@node3.rabbitmq.example.com:5672',
      ],
      connectionName: 'shared-app-connection',
      heartbeat: 60,
      prefetchCount: 10,
      reconnectDelay: 5000,
      maxReconnectAttempts: -1, // Unlimited retries
      exponentialBackoff: true,
      failoverStrategy: 'round-robin',
      poolConfig: {
        maxChannels: 50, // Large pool for shared usage across modules
        acquireTimeout: 5000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000,
      },
    });

    console.log(`\n✅ Shared client initialized: ${isSharedClientInitialized()}\n`);

    // ========================================================================
    // STEP 2: Create service instances - they all use the SAME connection
    // ========================================================================
    const userService = new UserService();
    const orderService = new OrderService();
    const notificationService = new NotificationService();

    // ========================================================================
    // STEP 3: Setup notification listener
    // ========================================================================
    await notificationService.startListening();

    // Wait a bit for consumer to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ========================================================================
    // STEP 4: Use services - all sharing the same RabbitMQ connection
    // ========================================================================
    console.log('\n📤 Publishing events from different services...\n');

    await userService.createUser({
      name: 'John Doe',
      email: 'john@example.com',
    });

    await orderService.createOrder({
      userId: 'user-123',
      items: ['item-1', 'item-2'],
    });

    await orderService.processOrder('order-456');

    await userService.deleteUser('user-123');

    // Wait for messages to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ========================================================================
    // STEP 5: Get metrics from the shared client
    // ========================================================================
    const client = getSharedClient();
    const metrics = client.getMetrics();
    console.log('\n📊 Shared Client Metrics:', metrics);

    // ========================================================================
    // STEP 6: Graceful shutdown - close the shared connection
    // ========================================================================
    console.log('\n🛑 Shutting down...');
    await closeSharedClient();
    console.log('👋 Application stopped\n');

  } catch (error) {
    console.error('💥 Error:', error);
    await closeSharedClient();
    process.exit(1);
  }
}

// Handle graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  await closeSharedClient();
  process.exit(0);
});

// Handle graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...');
  await closeSharedClient();
  process.exit(0);
});

// Run the application
main();

