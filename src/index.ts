/**
 * @fileoverview RabbitMQ Multi-Node Connector - Enterprise-grade RabbitMQ client
 * @module @slzsid/rabbitmq-multinode-connector
 * @author SleepySid
 * @version 0.1.0
 */

// Export main client
export { default as RabbitMQClient } from './rabbit.js';
export { default } from './rabbit.js';

// Export logger (optional - users can use their own)
export { default as logger } from './logger.js';

// Export custom error classes
export {
  RabbitMQError,
  ConnectionError,
  ConnectionTimeoutError,
  ChannelError,
  ChannelAcquisitionError,
  PublishError,
  PublishTimeoutError,
  ConsumeError,
  CircuitBreakerError,
  ConfigurationError,
  ReconnectionError,
  ClusterError,
  isRabbitMQError,
  isConnectionError,
  isChannelError,
  isPublishError,
  isCircuitBreakerError,
} from './errors.js';

// Export types and interfaces (re-export from rabbit.ts)
export type { QueueOptions, ExchangeOptions } from './rabbit.js';
