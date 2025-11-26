/**
 * @fileoverview Custom error classes for RabbitMQ client
 * @module errors
 */

/**
 * Base error class for all RabbitMQ-related errors
 */
export class RabbitMQError extends Error {
  /**
   * Creates a new RabbitMQ error
   * @param message - Error message
   * @param code - Error code for programmatic handling
   * @param details - Additional error context
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RabbitMQError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when connection to RabbitMQ fails
 */
export class ConnectionError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CONNECTION', details);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when connection attempt times out
 */
export class ConnectionTimeoutError extends ConnectionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { ...details, timeout: true });
    this.name = 'ConnectionTimeoutError';
  }
}

/**
 * Error thrown when channel operations fail
 */
export class ChannelError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CHANNEL', details);
    this.name = 'ChannelError';
  }
}

/**
 * Error thrown when channel acquisition from pool times out
 */
export class ChannelAcquisitionError extends ChannelError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { ...details, acquisition: true });
    this.name = 'ChannelAcquisitionError';
  }
}

/**
 * Error thrown when message publishing fails
 */
export class PublishError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_PUBLISH', details);
    this.name = 'PublishError';
  }
}

/**
 * Error thrown when publish operation times out
 */
export class PublishTimeoutError extends PublishError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { ...details, timeout: true });
    this.name = 'PublishTimeoutError';
  }
}

/**
 * Error thrown when message consumption fails
 */
export class ConsumeError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CONSUME', details);
    this.name = 'ConsumeError';
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CIRCUIT_BREAKER', details);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Error thrown for configuration validation failures
 */
export class ConfigurationError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CONFIGURATION', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when reconnection attempts are exhausted
 */
export class ReconnectionError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_RECONNECTION', details);
    this.name = 'ReconnectionError';
  }
}

/**
 * Error thrown when all cluster nodes are unavailable
 */
export class ClusterError extends RabbitMQError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERR_CLUSTER', details);
    this.name = 'ClusterError';
  }
}

/**
 * Type guard to check if error is a RabbitMQError
 */
export function isRabbitMQError(error: unknown): error is RabbitMQError {
  return error instanceof RabbitMQError;
}

/**
 * Type guard to check if error is a ConnectionError
 */
export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}

/**
 * Type guard to check if error is a ChannelError
 */
export function isChannelError(error: unknown): error is ChannelError {
  return error instanceof ChannelError;
}

/**
 * Type guard to check if error is a PublishError
 */
export function isPublishError(error: unknown): error is PublishError {
  return error instanceof PublishError;
}

/**
 * Type guard to check if error is a CircuitBreakerError
 */
export function isCircuitBreakerError(error: unknown): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError;
}
