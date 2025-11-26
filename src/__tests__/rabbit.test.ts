/**
 * @fileoverview Comprehensive test suite for RabbitMQClient
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import type { Mock } from 'jest-mock';

// Mock logger - must be before importing RabbitMQClient
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
};

jest.unstable_mockModule('../logger.js', () => ({
  default: mockLogger,
}));

// Mock amqplib
const mockConnect = jest.fn();
jest.unstable_mockModule('amqplib', () => ({
  connect: mockConnect,
  default: {
    connect: mockConnect,
  },
}));

// Dynamic import after mocks are set up
const { default: RabbitMQClient } = await import('../rabbit.js');

describe('RabbitMQClient', () => {
  let client: RabbitMQClient;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    // Setup mock channel
    mockChannel = new EventEmitter();
    mockChannel.publish = jest.fn((_ex, _key, _content, _opts, callback) => {
      if (callback) {
        callback(null);
      }
    });
    mockChannel.consume = jest.fn().mockResolvedValue({ consumerTag: 'test-tag' });
    mockChannel.assertQueue = jest
      .fn()
      .mockResolvedValue({ queue: 'test-queue', messageCount: 0, consumerCount: 0 });
    mockChannel.assertExchange = jest.fn().mockResolvedValue({ exchange: 'test-exchange' });
    mockChannel.bindQueue = jest.fn().mockResolvedValue(undefined);
    mockChannel.prefetch = jest.fn().mockResolvedValue(undefined);
    mockChannel.ack = jest.fn();
    mockChannel.nack = jest.fn();
    mockChannel.reject = jest.fn();
    mockChannel.close = jest.fn().mockResolvedValue(undefined);
    mockChannel.checkQueue = jest
      .fn()
      .mockResolvedValue({ queue: 'healthCheckQueue', messageCount: 0, consumerCount: 0 });
    mockChannel.deleteQueue = jest.fn().mockResolvedValue({ messageCount: 0 });
    mockChannel.purgeQueue = jest.fn().mockResolvedValue({ messageCount: 0 });
    mockChannel.unbindQueue = jest.fn().mockResolvedValue(undefined);
    mockChannel.deleteExchange = jest.fn().mockResolvedValue(undefined);
    mockChannel.cancel = jest.fn().mockResolvedValue(undefined);
    mockChannel.get = jest.fn().mockResolvedValue(false);
    mockChannel.sendToQueue = jest.fn((_queue, _content, _opts, callback) => {
      if (callback) {
        callback(null);
      }
    });
    mockChannel.closed = false;

    // Setup mock connection
    mockConnection = new EventEmitter();
    mockConnection.createConfirmChannel = jest.fn().mockResolvedValue(mockChannel);
    mockConnection.createChannel = jest.fn().mockResolvedValue(mockChannel);
    mockConnection.close = jest.fn().mockResolvedValue(undefined);
    mockConnection.connection = {
      stream: {
        readable: true,
        writable: true,
      },
    };
    mockConnection.closing = false;
    mockConnection.closed = false;

    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockConnection);
  });

  afterEach(async () => {
    if (client) {
      try {
        await client.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Constructor', () => {
    it('should create a new RabbitMQClient instance with default options', () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      expect(client).toBeInstanceOf(RabbitMQClient);
      expect(client).toBeInstanceOf(EventEmitter);
    });

    it('should throw error for invalid heartbeat', () => {
      expect(() => {
        new RabbitMQClient({
          urls: ['amqp://localhost:5672'],
          heartbeat: -1, // Invalid: negative value
        });
      }).toThrow('Heartbeat must be between');
    });

    it('should throw error for invalid reconnect delay', () => {
      expect(() => {
        new RabbitMQClient({
          urls: ['amqp://localhost:5672'],
          reconnectDelay: 100, // Invalid: too low
        });
      }).toThrow('Reconnect delay must be between');
    });

    it('should throw error for invalid max channels', () => {
      expect(() => {
        new RabbitMQClient({
          urls: ['amqp://localhost:5672'],
          poolConfig: {
            maxChannels: -1, // Invalid: negative value
            acquireTimeout: 5000,
          },
        });
      }).toThrow('Max channels must be greater than 0');
    });
  });

  describe('connect()', () => {
    it('should successfully connect to RabbitMQ', async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
        heartbeat: 60,
      });

      const connectedSpy = jest.fn();
      client.on('connected', connectedSpy);

      await client.connect();

      expect(mockConnect).toHaveBeenCalled();
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();
      expect(connectedSpy).toHaveBeenCalled();
    });

    it('should not connect again if already connected', async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await client.connect();
      mockConnect.mockClear();

      await client.connect();

      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should emit connectionError on connection failure', async () => {
      const error = new Error('Connection failed');
      // Reject all 5 initial connection retry attempts
      mockConnect.mockRejectedValue(error);

      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
        maxReconnectAttempts: 0,
      });

      const errorSpy = jest.fn();
      client.on('connectionFailed', errorSpy);

      await expect(client.connect()).rejects.toThrow('Failed to connect after 5 attempts');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should use circuit breaker after multiple failures', async () => {
      mockConnect.mockRejectedValue(new Error('Connection failed'));

      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
        maxReconnectAttempts: 0,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeout: 30000,
        },
      });

      // First failure
      await expect(client.connect()).rejects.toThrow();

      // Second failure
      await expect(client.connect()).rejects.toThrow();

      // Circuit breaker should be open
      await expect(client.connect()).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('publish()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should successfully publish a message', async () => {
      const exchange = 'test-exchange';
      const routingKey = 'test.key';
      const content = Buffer.from('test message');

      await client.publish(exchange, routingKey, content);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        content,
        {},
        expect.any(Function),
      );
    });

    it('should publish with options', async () => {
      const exchange = 'test-exchange';
      const routingKey = 'test.key';
      const content = Buffer.from('test message');
      const options = { persistent: true, priority: 5 };

      await client.publish(exchange, routingKey, content, options);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        exchange,
        routingKey,
        content,
        options,
        expect.any(Function),
      );
    });

    it('should handle publish errors', async () => {
      const error = new Error('Publish failed');
      mockChannel.publish = jest.fn((_ex, _key, _content, _opts, callback) => {
        callback(error);
      });

      await expect(
        client.publish('test-exchange', 'test.key', Buffer.from('test')),
      ).rejects.toThrow('Publish failed');
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(disconnectedClient.publish('test', 'test', Buffer.from('test'))).rejects.toThrow(
        'Not connected to RabbitMQ',
      );
    });

    it('should handle publish timeout', async () => {
      mockChannel.publish = jest.fn(); // Never calls callback

      await expect(
        client.publish('test-exchange', 'test.key', Buffer.from('test'), {
          timeout: 100,
        }),
      ).rejects.toThrow('Publish operation timeout');
    }, 10000);
  });

  describe('consume()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should successfully setup a consumer', async () => {
      const queue = 'test-queue';
      const onMessage = jest.fn();

      const consumerTag = await client.consume(queue, onMessage);

      expect(consumerTag).toBe('test-tag');
      expect(mockChannel.consume).toHaveBeenCalledWith(queue, expect.any(Function), {});
    });

    it('should handle incoming messages', async () => {
      const queue = 'test-queue';
      const messageHandler = jest.fn().mockResolvedValue(undefined);
      let consumeCallback: any;

      mockChannel.consume = jest.fn((_q, callback, _opts) => {
        consumeCallback = callback;
        return Promise.resolve({ consumerTag: 'test-tag' });
      });

      await client.consume(queue, messageHandler);

      const mockMessage = {
        content: Buffer.from('test message'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      };

      await consumeCallback(mockMessage);

      // In auto-ack mode, callback is called with (msg, undefined)
      expect(messageHandler).toHaveBeenCalledWith(mockMessage, undefined);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should nack message on processing error', async () => {
      const queue = 'test-queue';
      const error = new Error('Processing failed');
      const messageHandler = jest.fn().mockRejectedValue(error);
      let consumeCallback: any;

      mockChannel.consume = jest.fn((_q, callback, _opts) => {
        consumeCallback = callback;
        return Promise.resolve({ consumerTag: 'test-tag' });
      });

      // Handle the error event to prevent unhandled error
      const errorHandler = jest.fn();
      client.on('error', errorHandler);

      await client.consume(queue, messageHandler);

      const mockMessage = {
        content: Buffer.from('test message'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      };

      await consumeCallback(mockMessage);

      // In auto-ack mode, callback is called with (msg, undefined)
      expect(messageHandler).toHaveBeenCalledWith(mockMessage, undefined);
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(disconnectedClient.consume('test-queue', async () => {})).rejects.toThrow(
        'Not connected to RabbitMQ',
      );
    });

    it('should support manual acknowledgment mode', async () => {
      const queue = 'test-queue';
      let consumeCallback: any;
      let capturedActions: any;

      mockChannel.consume = jest.fn((_q, callback, _opts) => {
        consumeCallback = callback;
        return Promise.resolve({ consumerTag: 'test-tag' });
      });

      const messageHandler = jest.fn(async (_msg, actions) => {
        capturedActions = actions;
        // Manually acknowledge
        await actions.ack();
      });

      await client.consume(queue, messageHandler, { manualAck: true });

      const mockMessage = {
        content: Buffer.from('test message'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      };

      await consumeCallback(mockMessage);

      // In manual mode, actions should be provided
      expect(capturedActions).toBeDefined();
      expect(capturedActions.ack).toBeDefined();
      expect(capturedActions.nack).toBeDefined();
      expect(capturedActions.reject).toBeDefined();
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should allow nack with requeue in manual mode', async () => {
      const queue = 'test-queue';
      let consumeCallback: any;

      mockChannel.consume = jest.fn((_q, callback, _opts) => {
        consumeCallback = callback;
        return Promise.resolve({ consumerTag: 'test-tag' });
      });

      const messageHandler = jest.fn(async (_msg, actions) => {
        await actions.nack(true); // Requeue
      });

      await client.consume(queue, messageHandler, { manualAck: true });

      const mockMessage = {
        content: Buffer.from('test message'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      };

      await consumeCallback(mockMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should allow reject without requeue in manual mode', async () => {
      const queue = 'test-queue';
      let consumeCallback: any;

      mockChannel.consume = jest.fn((_q, callback, _opts) => {
        consumeCallback = callback;
        return Promise.resolve({ consumerTag: 'test-tag' });
      });

      const messageHandler = jest.fn(async (_msg, actions) => {
        await actions.reject(false); // Send to DLQ
      });

      await client.consume(queue, messageHandler, { manualAck: true });

      const mockMessage = {
        content: Buffer.from('test message'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      };

      await consumeCallback(mockMessage);

      expect(mockChannel.reject).toHaveBeenCalledWith(mockMessage, false);
    });
  });

  describe('sendToQueue()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should send message directly to queue', async () => {
      const queue = 'test-queue';
      const content = Buffer.from('test message');
      const options = { persistent: true };

      await client.sendToQueue(queue, content, options);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        queue,
        content,
        options,
        expect.any(Function),
      );
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(
        disconnectedClient.sendToQueue('test-queue', Buffer.from('test')),
      ).rejects.toThrow('Not connected to RabbitMQ');
    });
  });

  describe('get()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should get single message from queue', async () => {
      const queue = 'test-queue';
      const mockMessage = {
        content: Buffer.from('test message'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      };

      mockChannel.get = jest.fn().mockResolvedValue(mockMessage);

      const result = await client.get(queue);

      expect(mockChannel.get).toHaveBeenCalledWith(queue, {});
      expect(result).toEqual(mockMessage);
    });

    it('should return false when queue is empty', async () => {
      const queue = 'test-queue';
      mockChannel.get = jest.fn().mockResolvedValue(false);

      const result = await client.get(queue);

      expect(result).toBe(false);
    });
  });

  describe('ack/nack/reject()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should acknowledge a message', () => {
      const mockMessage = {
        content: Buffer.from('test'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      } as any;

      client.ack(mockMessage);
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage, false);
    });

    it('should nack a message with requeue', () => {
      const mockMessage = {
        content: Buffer.from('test'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      } as any;

      client.nack(mockMessage, false, true);
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should reject a message', () => {
      const mockMessage = {
        content: Buffer.from('test'),
        fields: { deliveryTag: 1, exchange: 'test', routingKey: 'test' },
        properties: {},
      } as any;

      client.reject(mockMessage, false);
      expect(mockChannel.reject).toHaveBeenCalledWith(mockMessage, false);
    });
  });

  describe('cancel()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should cancel a consumer', async () => {
      const consumerTag = 'test-consumer-tag';

      await client.cancel(consumerTag);

      expect(mockChannel.cancel).toHaveBeenCalledWith(consumerTag);
    });
  });

  describe('prefetch()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should set prefetch count', async () => {
      await client.prefetch(10);

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10, false);
    });

    it('should set global prefetch', async () => {
      await client.prefetch(100, true);

      expect(mockChannel.prefetch).toHaveBeenCalledWith(100, true);
    });
  });

  describe('deleteQueue()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should delete a queue', async () => {
      mockChannel.deleteQueue = jest.fn().mockResolvedValue({ messageCount: 5 });

      const result = await client.deleteQueue('test-queue');

      expect(mockChannel.deleteQueue).toHaveBeenCalledWith('test-queue', {});
      expect(result.messageCount).toBe(5);
    });
  });

  describe('purgeQueue()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should purge a queue', async () => {
      mockChannel.purgeQueue = jest.fn().mockResolvedValue({ messageCount: 10 });

      const result = await client.purgeQueue('test-queue');

      expect(mockChannel.purgeQueue).toHaveBeenCalledWith('test-queue');
      expect(result.messageCount).toBe(10);
    });
  });

  describe('unbindQueue()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should unbind queue from exchange', async () => {
      await client.unbindQueue('test-queue', 'test-exchange', 'test.key');

      expect(mockChannel.unbindQueue).toHaveBeenCalledWith(
        'test-queue',
        'test-exchange',
        'test.key',
      );
    });
  });

  describe('deleteExchange()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should delete an exchange', async () => {
      await client.deleteExchange('test-exchange');

      expect(mockChannel.deleteExchange).toHaveBeenCalledWith('test-exchange', {});
    });
  });

  describe('assertQueue()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should successfully assert a queue', async () => {
      const queue = 'test-queue';
      const options = { durable: true };

      const result = await client.assertQueue(queue, options);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, options);
      expect(result).toEqual({
        queue: 'test-queue',
        messageCount: 0,
        consumerCount: 0,
      });
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(disconnectedClient.assertQueue('test-queue')).rejects.toThrow(
        'Not connected to RabbitMQ',
      );
    });
  });

  describe('assertExchange()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should successfully assert an exchange', async () => {
      const exchange = 'test-exchange';
      const type = 'topic';
      const options = { durable: true };

      await client.assertExchange(exchange, type, options);

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(exchange, type, options);
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(disconnectedClient.assertExchange('test-exchange', 'topic')).rejects.toThrow(
        'Not connected to RabbitMQ',
      );
    });
  });

  describe('bindQueue()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should successfully bind a queue to an exchange', async () => {
      const queue = 'test-queue';
      const exchange = 'test-exchange';
      const pattern = 'test.*';

      await client.bindQueue(queue, exchange, pattern);

      expect(mockChannel.bindQueue).toHaveBeenCalledWith(queue, exchange, pattern);
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(
        disconnectedClient.bindQueue('test-queue', 'test-exchange', 'test.*'),
      ).rejects.toThrow('Not connected to RabbitMQ');
    });
  });

  describe('publishBatch()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should successfully publish a batch of messages', async () => {
      const messages = [
        {
          exchange: 'test-exchange',
          routingKey: 'test.1',
          content: Buffer.from('message 1'),
          options: {},
        },
        {
          exchange: 'test-exchange',
          routingKey: 'test.2',
          content: Buffer.from('message 2'),
          options: {},
        },
      ];

      await client.publishBatch(messages);

      expect(mockChannel.publish).toHaveBeenCalledTimes(2);
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(disconnectedClient.publishBatch([])).rejects.toThrow(
        'Not connected to RabbitMQ',
      );
    });
  });

  describe('healthCheck()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should return true when connection is healthy', async () => {
      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      const result = await disconnectedClient.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false on health check error', async () => {
      mockChannel.assertQueue = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('getMetrics()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should return current metrics', () => {
      const metrics = client.getMetrics();

      expect(metrics).toHaveProperty('messagesSent');
      expect(metrics).toHaveProperty('messagesReceived');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('reconnections');
      expect(metrics).toHaveProperty('lastReconnectTime');
      expect(metrics).toHaveProperty('avgProcessingTime');
    });

    it('should update metrics after publishing', async () => {
      await client.publish('test', 'test', Buffer.from('test'));

      const metrics = client.getMetrics();
      expect(metrics.messagesSent).toBeGreaterThan(0);
    });
  });

  describe('getChannel() and releaseChannel()', () => {
    beforeEach(async () => {
      // Create unique mock channels for each createConfirmChannel call
      let channelCount = 0;
      mockConnection.createConfirmChannel = jest.fn(() => {
        channelCount++;
        const newChannel = new EventEmitter();
        Object.assign(newChannel, {
          publish: jest.fn((_ex, _key, _content, _opts, callback) => {
            if (callback) callback(null);
          }),
          consume: jest.fn().mockResolvedValue({ consumerTag: 'test-tag' }),
          assertQueue: jest
            .fn()
            .mockResolvedValue({ queue: 'test-queue', messageCount: 0, consumerCount: 0 }),
          assertExchange: jest.fn().mockResolvedValue({ exchange: 'test-exchange' }),
          bindQueue: jest.fn().mockResolvedValue(undefined),
          prefetch: jest.fn().mockResolvedValue(undefined),
          ack: jest.fn(),
          nack: jest.fn(),
          close: jest.fn().mockResolvedValue(undefined),
          checkQueue: jest
            .fn()
            .mockResolvedValue({ queue: 'healthCheckQueue', messageCount: 0, consumerCount: 0 }),
          deleteQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
          closed: false,
          _id: channelCount,
        });
        return Promise.resolve(newChannel);
      });

      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
        poolConfig: {
          maxChannels: 2,
          acquireTimeout: 500,
        },
      });
      await client.connect();
    });

    it('should acquire and release a channel from the pool', async () => {
      const channel = await client.getChannel();
      expect(channel).toBeDefined();

      client.releaseChannel(channel);
      // No error should be thrown
    });

    it('should create new channel if pool is not full', async () => {
      const channel1 = await client.getChannel();
      const channel2 = await client.getChannel();

      expect(channel1).toBeDefined();
      expect(channel2).toBeDefined();
    });

    it('should throw error when not connected', async () => {
      const disconnectedClient = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      await expect(disconnectedClient.getChannel()).rejects.toThrow('Not connected to RabbitMQ');
    });
  });

  describe('close()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should close connection and channels gracefully', async () => {
      const closedSpy = jest.fn();
      client.on('closed', closedSpy);

      await client.close();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(closedSpy).toHaveBeenCalled();
    });
  });

  describe('gracefulShutdown()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should perform graceful shutdown', async () => {
      await client.gracefulShutdown();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should not shutdown twice', async () => {
      await client.gracefulShutdown();
      mockConnection.close.mockClear();

      await client.gracefulShutdown();

      expect(mockConnection.close).not.toHaveBeenCalled();
    });
  });

  describe('Cluster Support', () => {
    it('should try multiple cluster nodes on connection failure', async () => {
      const urls = ['amqp://node1:5672', 'amqp://node2:5672', 'amqp://node3:5672'];

      mockConnect
        .mockRejectedValueOnce(new Error('Node 1 failed'))
        .mockRejectedValueOnce(new Error('Node 2 failed'))
        .mockResolvedValueOnce(mockConnection);

      client = new RabbitMQClient({
        urls,
        failoverStrategy: 'round-robin',
      });

      await client.connect();

      expect(mockConnect).toHaveBeenCalledTimes(3);
    });

    it('should support random failover strategy', async () => {
      const urls = ['amqp://node1:5672', 'amqp://node2:5672'];

      client = new RabbitMQClient({
        urls,
        failoverStrategy: 'random',
      });

      await client.connect();

      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('Channel Pool', () => {
    beforeEach(async () => {
      // Create unique mock channels for each createConfirmChannel call
      let channelCount = 0;
      mockConnection.createConfirmChannel = jest.fn(() => {
        channelCount++;
        const newChannel = new EventEmitter();
        Object.assign(newChannel, {
          publish: jest.fn((_ex, _key, _content, _opts, callback) => {
            if (callback) callback(null);
          }),
          consume: jest.fn().mockResolvedValue({ consumerTag: 'test-tag' }),
          assertQueue: jest
            .fn()
            .mockResolvedValue({ queue: 'test-queue', messageCount: 0, consumerCount: 0 }),
          assertExchange: jest.fn().mockResolvedValue({ exchange: 'test-exchange' }),
          bindQueue: jest.fn().mockResolvedValue(undefined),
          prefetch: jest.fn().mockResolvedValue(undefined),
          ack: jest.fn(),
          nack: jest.fn(),
          close: jest.fn().mockResolvedValue(undefined),
          checkQueue: jest
            .fn()
            .mockResolvedValue({ queue: 'healthCheckQueue', messageCount: 0, consumerCount: 0 }),
          deleteQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
          closed: false,
          _id: channelCount,
        });
        return Promise.resolve(newChannel);
      });

      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
        poolConfig: {
          maxChannels: 3,
          acquireTimeout: 500,
        },
      });
      await client.connect();
    });

    it('should manage channel pool correctly', async () => {
      const channel1 = await client.getChannel();
      expect(channel1).toBeDefined();

      // Release the channel
      client.releaseChannel(channel1);

      // Should reuse released channel
      const channel2 = await client.getChannel();
      expect(channel2).toBe(channel1);
    });

    it('should timeout when acquiring channel from full pool', async () => {
      const channels: any[] = [];

      // Fill the pool
      for (let i = 0; i < 3; i++) {
        channels.push(await client.getChannel());
      }

      // Try to acquire when pool is full
      await expect(client.getChannel()).rejects.toThrow('Channel acquisition timeout');
    }, 10000);
  });

  describe('Event Emission', () => {
    it('should emit connecting event', async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      const connectingSpy = jest.fn();
      client.on('connecting', connectingSpy);

      await client.connect();

      expect(connectingSpy).toHaveBeenCalled();
    });

    it('should support metrics event listener', async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });

      const metricsSpy = jest.fn();
      client.on('metrics', metricsSpy);

      // Manually emit metrics event to test the listener
      client.emit('metrics', client.getMetrics());

      expect(metricsSpy).toHaveBeenCalled();
      expect(metricsSpy.mock.calls[0][0]).toHaveProperty('messagesSent');
    });
  });

  describe('updateMetrics()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should update sent metrics', async () => {
      await client.updateMetrics('sent');
      const metrics = client.getMetrics();
      expect(metrics.messagesSent).toBe(1);
    });

    it('should update received metrics', async () => {
      await client.updateMetrics('received');
      const metrics = client.getMetrics();
      expect(metrics.messagesReceived).toBe(1);
    });

    it('should update error metrics', async () => {
      await client.updateMetrics('error');
      const metrics = client.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    it('should update reconnection metrics', async () => {
      await client.updateMetrics('reconnect');
      const metrics = client.getMetrics();
      expect(metrics.reconnections).toBe(1);
      expect(metrics.lastReconnectTime).toBeInstanceOf(Date);
    });
  });

  describe('cleanupStaleChannels()', () => {
    beforeEach(async () => {
      client = new RabbitMQClient({
        urls: ['amqp://localhost:5672'],
      });
      await client.connect();
    });

    it('should cleanup stale channels', async () => {
      // Get a channel and mark it as closed
      const channel = await client.getChannel();
      (channel as any).closed = true;

      await client.cleanupStaleChannels();

      // The stale channel should be removed
      // (testing implementation details here)
    });
  });
});
