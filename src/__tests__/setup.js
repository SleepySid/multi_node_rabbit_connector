/**
 * @fileoverview Jest test setup file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in test output
process.env.SERVICE_NAME = 'rabbitmq-connector-test';
process.env.ENV = 'TEST';

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(() => {
  // Perform any global cleanup here
});
