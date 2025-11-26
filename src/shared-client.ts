/**
 * @fileoverview Shared RabbitMQ Client Singleton
 * @description Provides a single shared RabbitMQ connection for the entire application
 * @version 1.0.0
 * @author SID
 * @since 1.0.0
 */

import RabbitMQClient from './rabbit.js';
import logger from './logger.js';

/**
 * Single shared RabbitMQ client instance
 * @private
 */
let sharedClient: RabbitMQClient | null = null;

/**
 * Flag to track if client is being initialized
 * @private
 */
let isInitializing = false;

/**
 * Promise for ongoing initialization
 * @private
 */
let initializationPromise: Promise<void> | null = null;

/**
 * Configuration interface for shared client
 */
export interface SharedClientConfig {
  /** Array of RabbitMQ cluster URLs */
  urls: string[];
  /** Connection name for identification */
  connectionName?: string;
  /** Heartbeat interval in seconds */
  heartbeat?: number;
  /** Prefetch count for consumers */
  prefetchCount?: number;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (-1 for unlimited) */
  maxReconnectAttempts?: number;
  /** Enable exponential backoff for reconnection */
  exponentialBackoff?: boolean;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Failover strategy for cluster */
  failoverStrategy?: 'round-robin' | 'random';
  /** Channel pool configuration */
  poolConfig?: {
    maxChannels: number;
    acquireTimeout: number;
  };
  /** Circuit breaker configuration */
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
  /** SSL/TLS configuration */
  ssl?: {
    enabled: boolean;
    validate?: boolean;
    ca?: string[];
    cert?: string;
    key?: string;
    passphrase?: string;
  };
}

/**
 * Get the shared RabbitMQ client instance
 * 
 * @returns {RabbitMQClient} The shared client instance
 * @throws {Error} If client has not been initialized
 * 
 * @example
 * ```typescript
 * import { getSharedClient } from './shared-client.js';
 * 
 * const client = getSharedClient();
 * await client.publish('exchange', 'routing.key', Buffer.from('message'));
 * ```
 */
export function getSharedClient(): RabbitMQClient {
  if (!sharedClient) {
    throw new Error(
      'Shared RabbitMQ client not initialized. Call initializeSharedClient() first.'
    );
  }
  return sharedClient;
}

/**
 * Initialize the shared RabbitMQ client
 * This should be called once at application startup
 * 
 * @param {SharedClientConfig} config - Configuration for the RabbitMQ client
 * @returns {Promise<RabbitMQClient>} The initialized client instance
 * 
 * @example
 * ```typescript
 * import { initializeSharedClient } from './shared-client.js';
 * 
 * await initializeSharedClient({
 *   urls: ['amqp://localhost:5672'],
 *   connectionName: 'my-app',
 *   poolConfig: {
 *     maxChannels: 50,
 *     acquireTimeout: 5000,
 *   },
 * });
 * ```
 */
export async function initializeSharedClient(
  config: SharedClientConfig
): Promise<RabbitMQClient> {
  // If already initialized, return existing instance
  if (sharedClient) {
    logger.warn(
      'Shared RabbitMQ client already initialized. Returning existing instance.',
      'initializeSharedClient'
    );
    return sharedClient;
  }

  // If initialization is in progress, wait for it
  if (isInitializing && initializationPromise) {
    logger.info(
      'Shared RabbitMQ client initialization in progress. Waiting...',
      'initializeSharedClient'
    );
    await initializationPromise;
    return sharedClient!;
  }

  // Start initialization
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      logger.info('Initializing shared RabbitMQ client...', 'initializeSharedClient', {
        urls: config.urls,
        connectionName: config.connectionName,
      });

      // Create the client instance
      sharedClient = new RabbitMQClient({
        urls: config.urls,
        connectionName: config.connectionName || 'shared-rabbitmq-client',
        heartbeat: config.heartbeat || 60,
        prefetchCount: config.prefetchCount || 10,
        reconnectDelay: config.reconnectDelay || 5000,
        maxReconnectAttempts: config.maxReconnectAttempts ?? -1,
        exponentialBackoff: config.exponentialBackoff ?? true,
        connectionTimeout: config.connectionTimeout || 30000,
        failoverStrategy: config.failoverStrategy || 'round-robin',
        poolConfig: config.poolConfig || {
          maxChannels: 50,
          acquireTimeout: 5000,
        },
        circuitBreaker: config.circuitBreaker || {
          failureThreshold: 5,
          resetTimeout: 30000,
        },
        ssl: config.ssl,
      });

      // Set up event listeners for monitoring
      sharedClient.on('connected', () => {
        logger.info('✅ Shared RabbitMQ client connected', 'SharedClient');
      });

      sharedClient.on('connectionError', (error) => {
        logger.error('❌ Shared RabbitMQ connection error', 'SharedClient', { error });
      });

      sharedClient.on('reconnecting', () => {
        logger.warn('🔄 Shared RabbitMQ client reconnecting...', 'SharedClient');
      });

      sharedClient.on('reconnected', () => {
        logger.info('✅ Shared RabbitMQ client reconnected', 'SharedClient');
      });

      sharedClient.on('error', (error) => {
        logger.error('💥 Shared RabbitMQ client error', 'SharedClient', { error });
      });

      // Connect to RabbitMQ
      await sharedClient.connect();

      logger.info('✅ Shared RabbitMQ client initialized successfully', 'initializeSharedClient');
    } catch (error) {
      logger.error('Failed to initialize shared RabbitMQ client', 'initializeSharedClient', {
        error,
      });
      sharedClient = null;
      throw error;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  await initializationPromise;
  return sharedClient!;
}

/**
 * Close the shared RabbitMQ client
 * This should be called once at application shutdown
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * import { closeSharedClient } from './shared-client.js';
 * 
 * process.on('SIGINT', async () => {
 *   await closeSharedClient();
 *   process.exit(0);
 * });
 * ```
 */
export async function closeSharedClient(): Promise<void> {
  if (!sharedClient) {
    logger.warn('Shared RabbitMQ client not initialized. Nothing to close.', 'closeSharedClient');
    return;
  }

  try {
    logger.info('Closing shared RabbitMQ client...', 'closeSharedClient');
    await sharedClient.gracefulShutdown();
    sharedClient = null;
    logger.info('👋 Shared RabbitMQ client closed successfully', 'closeSharedClient');
  } catch (error) {
    logger.error('Error closing shared RabbitMQ client', 'closeSharedClient', { error });
    throw error;
  }
}

/**
 * Check if the shared client is initialized
 * 
 * @returns {boolean} True if initialized, false otherwise
 */
export function isSharedClientInitialized(): boolean {
  return sharedClient !== null;
}

