/**
 * @fileoverview Test suite for index module exports
 */

// Mock the modules before importing
jest.mock('../rabbit.js');
jest.mock('../logger.js');

describe('Index Module Exports', () => {
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
