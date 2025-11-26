/**
 * @fileoverview Tests for custom error classes
 */

import {
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
} from '../errors.js';

describe('RabbitMQError', () => {
  it('should create a basic RabbitMQ error', () => {
    const error = new RabbitMQError('Test error', 'TEST_ERROR');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('RabbitMQError');
    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toBeDefined();
  });

  it('should include details when provided', () => {
    const details = { key: 'value', count: 42 };
    const error = new RabbitMQError('Test error', 'TEST_ERROR', details);

    expect(error.details).toEqual(details);
  });

  it('should convert to JSON correctly', () => {
    const details = { key: 'value' };
    const error = new RabbitMQError('Test error', 'TEST_ERROR', details);
    const json = error.toJSON();

    expect(json).toHaveProperty('name', 'RabbitMQError');
    expect(json).toHaveProperty('message', 'Test error');
    expect(json).toHaveProperty('code', 'TEST_ERROR');
    expect(json).toHaveProperty('details', details);
    expect(json).toHaveProperty('stack');
  });
});

describe('ConnectionError', () => {
  it('should create a connection error with correct properties', () => {
    const error = new ConnectionError('Connection failed');

    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('ERR_CONNECTION');
    expect(error.name).toBe('ConnectionError');
    expect(error).toBeInstanceOf(RabbitMQError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should include details', () => {
    const details = { host: 'localhost', port: 5672 };
    const error = new ConnectionError('Connection failed', details);

    expect(error.details).toEqual(details);
  });
});

describe('ConnectionTimeoutError', () => {
  it('should create a timeout error', () => {
    const error = new ConnectionTimeoutError('Connection timeout');

    expect(error.message).toBe('Connection timeout');
    expect(error.name).toBe('ConnectionTimeoutError');
    expect(error).toBeInstanceOf(ConnectionError);
    expect(error.details).toHaveProperty('timeout', true);
  });

  it('should merge timeout flag with provided details', () => {
    const details = { host: 'localhost' };
    const error = new ConnectionTimeoutError('Connection timeout', details);

    expect(error.details).toEqual({ host: 'localhost', timeout: true });
  });
});

describe('ChannelError', () => {
  it('should create a channel error', () => {
    const error = new ChannelError('Channel operation failed');

    expect(error.message).toBe('Channel operation failed');
    expect(error.code).toBe('ERR_CHANNEL');
    expect(error.name).toBe('ChannelError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('ChannelAcquisitionError', () => {
  it('should create a channel acquisition error', () => {
    const error = new ChannelAcquisitionError('Failed to acquire channel');

    expect(error.message).toBe('Failed to acquire channel');
    expect(error.name).toBe('ChannelAcquisitionError');
    expect(error).toBeInstanceOf(ChannelError);
    expect(error.details).toHaveProperty('acquisition', true);
  });
});

describe('PublishError', () => {
  it('should create a publish error', () => {
    const error = new PublishError('Failed to publish message');

    expect(error.message).toBe('Failed to publish message');
    expect(error.code).toBe('ERR_PUBLISH');
    expect(error.name).toBe('PublishError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('PublishTimeoutError', () => {
  it('should create a publish timeout error', () => {
    const error = new PublishTimeoutError('Publish timeout');

    expect(error.message).toBe('Publish timeout');
    expect(error.name).toBe('PublishTimeoutError');
    expect(error).toBeInstanceOf(PublishError);
    expect(error.details).toHaveProperty('timeout', true);
  });
});

describe('ConsumeError', () => {
  it('should create a consume error', () => {
    const error = new ConsumeError('Failed to consume message');

    expect(error.message).toBe('Failed to consume message');
    expect(error.code).toBe('ERR_CONSUME');
    expect(error.name).toBe('ConsumeError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('CircuitBreakerError', () => {
  it('should create a circuit breaker error', () => {
    const error = new CircuitBreakerError('Circuit breaker is open');

    expect(error.message).toBe('Circuit breaker is open');
    expect(error.code).toBe('ERR_CIRCUIT_BREAKER');
    expect(error.name).toBe('CircuitBreakerError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('ConfigurationError', () => {
  it('should create a configuration error', () => {
    const error = new ConfigurationError('Invalid configuration');

    expect(error.message).toBe('Invalid configuration');
    expect(error.code).toBe('ERR_CONFIGURATION');
    expect(error.name).toBe('ConfigurationError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('ReconnectionError', () => {
  it('should create a reconnection error', () => {
    const error = new ReconnectionError('Reconnection attempts exhausted');

    expect(error.message).toBe('Reconnection attempts exhausted');
    expect(error.code).toBe('ERR_RECONNECTION');
    expect(error.name).toBe('ReconnectionError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('ClusterError', () => {
  it('should create a cluster error', () => {
    const error = new ClusterError('All cluster nodes unavailable');

    expect(error.message).toBe('All cluster nodes unavailable');
    expect(error.code).toBe('ERR_CLUSTER');
    expect(error.name).toBe('ClusterError');
    expect(error).toBeInstanceOf(RabbitMQError);
  });
});

describe('Type Guards', () => {
  describe('isRabbitMQError', () => {
    it('should return true for RabbitMQError instances', () => {
      const error = new RabbitMQError('Test', 'TEST');
      expect(isRabbitMQError(error)).toBe(true);
    });

    it('should return true for derived error instances', () => {
      const error = new ConnectionError('Test');
      expect(isRabbitMQError(error)).toBe(true);
    });

    it('should return false for standard errors', () => {
      const error = new Error('Test');
      expect(isRabbitMQError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isRabbitMQError('string')).toBe(false);
      expect(isRabbitMQError(null)).toBe(false);
      expect(isRabbitMQError(undefined)).toBe(false);
      expect(isRabbitMQError(42)).toBe(false);
    });
  });

  describe('isConnectionError', () => {
    it('should return true for ConnectionError', () => {
      const error = new ConnectionError('Test');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return true for ConnectionTimeoutError', () => {
      const error = new ConnectionTimeoutError('Test');
      expect(isConnectionError(error)).toBe(true);
    });

    it('should return false for other RabbitMQErrors', () => {
      const error = new ChannelError('Test');
      expect(isConnectionError(error)).toBe(false);
    });
  });

  describe('isChannelError', () => {
    it('should return true for ChannelError', () => {
      const error = new ChannelError('Test');
      expect(isChannelError(error)).toBe(true);
    });

    it('should return true for ChannelAcquisitionError', () => {
      const error = new ChannelAcquisitionError('Test');
      expect(isChannelError(error)).toBe(true);
    });

    it('should return false for other RabbitMQErrors', () => {
      const error = new ConnectionError('Test');
      expect(isChannelError(error)).toBe(false);
    });
  });

  describe('isPublishError', () => {
    it('should return true for PublishError', () => {
      const error = new PublishError('Test');
      expect(isPublishError(error)).toBe(true);
    });

    it('should return true for PublishTimeoutError', () => {
      const error = new PublishTimeoutError('Test');
      expect(isPublishError(error)).toBe(true);
    });

    it('should return false for other RabbitMQErrors', () => {
      const error = new ConnectionError('Test');
      expect(isPublishError(error)).toBe(false);
    });
  });

  describe('isCircuitBreakerError', () => {
    it('should return true for CircuitBreakerError', () => {
      const error = new CircuitBreakerError('Test');
      expect(isCircuitBreakerError(error)).toBe(true);
    });

    it('should return false for other RabbitMQErrors', () => {
      const error = new ConnectionError('Test');
      expect(isCircuitBreakerError(error)).toBe(false);
    });
  });
});

describe('Error Inheritance Chain', () => {
  it('should maintain proper inheritance chain', () => {
    const connectionError = new ConnectionError('Test');
    const channelError = new ChannelError('Test');
    const publishError = new PublishError('Test');

    expect(connectionError).toBeInstanceOf(RabbitMQError);
    expect(connectionError).toBeInstanceOf(Error);

    expect(channelError).toBeInstanceOf(RabbitMQError);
    expect(channelError).toBeInstanceOf(Error);

    expect(publishError).toBeInstanceOf(RabbitMQError);
    expect(publishError).toBeInstanceOf(Error);
  });

  it('should have proper stack traces', () => {
    const error = new ConnectionError('Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ConnectionError');
    expect(error.stack).toContain('Test error');
  });
});
