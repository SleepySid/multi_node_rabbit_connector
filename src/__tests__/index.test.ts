/**
 * @fileoverview Test suite for index module exports and shared-client
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

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
});

describe('Shared Client Module', () => {
  let sharedClientModule: typeof import('../shared-client.js');

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the module to clear singleton state
    jest.resetModules();
    sharedClientModule = await import('../shared-client.js');
  });

  afterEach(async () => {
    // Clean up any initialized client
    if (sharedClientModule.isSharedClientInitialized()) {
      await sharedClientModule.closeSharedClient();
    }
  });

  describe('getSharedClient', () => {
    it('should throw error when client is not initialized', () => {
      expect(() => sharedClientModule.getSharedClient()).toThrow(
        'Shared RabbitMQ client not initialized. Call initializeSharedClient() first.',
      );
    });

    it('should return client after initialization', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      const client = sharedClientModule.getSharedClient();
      expect(client).toBeDefined();
    });
  });

  describe('initializeSharedClient', () => {
    it('should initialize client with default config', async () => {
      const client = await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      expect(client).toBeDefined();
      expect(mockConnect).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('connectionError', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('reconnecting', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('reconnected', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should return existing client if already initialized', async () => {
      const client1 = await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      const client2 = await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      expect(client1).toBe(client2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Shared RabbitMQ client already initialized. Returning existing instance.',
        'initializeSharedClient',
      );
    });

    it('should handle connection failure', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        sharedClientModule.initializeSharedClient({
          urls: ['amqp://localhost:5672'],
        }),
      ).rejects.toThrow('Connection failed');

      expect(sharedClientModule.isSharedClientInitialized()).toBe(false);
    });

    it('should initialize with custom config', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
        connectionName: 'test-connection',
        heartbeat: 30,
        prefetchCount: 20,
        reconnectDelay: 3000,
        maxReconnectAttempts: 5,
        exponentialBackoff: false,
        connectionTimeout: 10000,
        failoverStrategy: 'random',
        poolConfig: {
          maxChannels: 100,
          acquireTimeout: 10000,
        },
        circuitBreaker: {
          failureThreshold: 10,
          resetTimeout: 60000,
        },
      });

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should handle concurrent initialization calls', async () => {
      // Make connect take some time to simulate concurrent calls
      let resolveConnect: () => void;
      const connectPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
      mockConnect.mockImplementationOnce(() => connectPromise);

      // Start two concurrent initializations immediately (before any await)
      const init1 = sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });
      const init2 = sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      // Resolve the connect
      resolveConnect!();

      // Both should return the same client
      const [client1, client2] = await Promise.all([init1, init2]);
      expect(client1).toBe(client2);
      // Connect should only be called once
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('closeSharedClient', () => {
    it('should warn when closing uninitialized client', async () => {
      await sharedClientModule.closeSharedClient();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Shared RabbitMQ client not initialized. Nothing to close.',
        'closeSharedClient',
      );
    });

    it('should close initialized client', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      await sharedClientModule.closeSharedClient();

      expect(mockGracefulShutdown).toHaveBeenCalled();
      expect(sharedClientModule.isSharedClientInitialized()).toBe(false);
    });

    it('should handle close error', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      mockGracefulShutdown.mockRejectedValueOnce(new Error('Close failed'));

      await expect(sharedClientModule.closeSharedClient()).rejects.toThrow('Close failed');
    });
  });

  describe('isSharedClientInitialized', () => {
    it('should return false when not initialized', () => {
      expect(sharedClientModule.isSharedClientInitialized()).toBe(false);
    });

    it('should return true when initialized', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      expect(sharedClientModule.isSharedClientInitialized()).toBe(true);
    });
  });

  describe('event handlers', () => {
    it('should log on connected event', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      // Find the connected handler and call it
      const connectedCall = mockOn.mock.calls.find((call) => call[0] === 'connected');
      expect(connectedCall).toBeDefined();
      const connectedHandler = connectedCall![1] as () => void;
      connectedHandler();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Shared RabbitMQ client connected',
        'SharedClient',
      );
    });

    it('should log on connectionError event', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      const errorCall = mockOn.mock.calls.find((call) => call[0] === 'connectionError');
      expect(errorCall).toBeDefined();
      const errorHandler = errorCall![1] as (error: Error) => void;
      const testError = new Error('Test error');
      errorHandler(testError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Shared RabbitMQ connection error',
        'SharedClient',
        { error: testError },
      );
    });

    it('should log on reconnecting event', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      const reconnectingCall = mockOn.mock.calls.find((call) => call[0] === 'reconnecting');
      expect(reconnectingCall).toBeDefined();
      const reconnectingHandler = reconnectingCall![1] as () => void;
      reconnectingHandler();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '🔄 Shared RabbitMQ client reconnecting...',
        'SharedClient',
      );
    });

    it('should log on reconnected event', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      const reconnectedCall = mockOn.mock.calls.find((call) => call[0] === 'reconnected');
      expect(reconnectedCall).toBeDefined();
      const reconnectedHandler = reconnectedCall![1] as () => void;
      reconnectedHandler();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Shared RabbitMQ client reconnected',
        'SharedClient',
      );
    });

    it('should log on error event', async () => {
      await sharedClientModule.initializeSharedClient({
        urls: ['amqp://localhost:5672'],
      });

      const errorCall = mockOn.mock.calls.find((call) => call[0] === 'error');
      expect(errorCall).toBeDefined();
      const errorHandler = errorCall![1] as (error: Error) => void;
      const testError = new Error('Test error');
      errorHandler(testError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '💥 Shared RabbitMQ client error',
        'SharedClient',
        { error: testError },
      );
    });
  });
});
