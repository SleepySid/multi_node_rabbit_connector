/**
 * @fileoverview Test suite for index module exports
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the modules before importing
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
};

const mockConnect = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockGracefulShutdown = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockOn = jest.fn();

class MockRabbitMQClient {
  connect = mockConnect;
  gracefulShutdown = mockGracefulShutdown;
  on = mockOn;
}

jest.unstable_mockModule('../logger.js', () => ({
  default: mockLogger,
}));

jest.unstable_mockModule('../rabbit.js', () => ({
  default: MockRabbitMQClient,
}));

describe('Index Module Exports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export RabbitMQClient as default', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.default).toBeDefined();
  });

  it('should export RabbitMQClient as named export', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.RabbitMQClient).toBeDefined();
  });

  it('should export logger', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.logger).toBeDefined();
  });

  it('should export QueueOptions type', async () => {
    const indexModule = await import('../index.js');
    // Type exports can't be tested at runtime, but we can verify the import doesn't fail
    expect(indexModule).toBeDefined();
  });

  it('should export ExchangeOptions type', async () => {
    const indexModule = await import('../index.js');
    // Type exports can't be tested at runtime, but we can verify the import doesn't fail
    expect(indexModule).toBeDefined();
  });

  it('should export error classes', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.RabbitMQError).toBeDefined();
    expect(indexModule.ConnectionError).toBeDefined();
    expect(indexModule.ChannelError).toBeDefined();
    expect(indexModule.PublishError).toBeDefined();
    expect(indexModule.CircuitBreakerError).toBeDefined();
  });

  it('should export error type guards', async () => {
    const indexModule = await import('../index.js');
    expect(indexModule.isRabbitMQError).toBeDefined();
    expect(indexModule.isConnectionError).toBeDefined();
    expect(indexModule.isChannelError).toBeDefined();
    expect(indexModule.isPublishError).toBeDefined();
    expect(indexModule.isCircuitBreakerError).toBeDefined();
  });
});
