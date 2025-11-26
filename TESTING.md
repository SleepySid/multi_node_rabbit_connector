# Testing Guide

This document provides comprehensive information about testing the RabbitMQ Multi-Node Connector library.

## Table of Contents

- [Test Suite Overview](#test-suite-overview)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Continuous Integration](#continuous-integration)

## Test Suite Overview

The test suite includes comprehensive tests for:

1. **RabbitMQClient** (`rabbit.test.ts`)
   - Connection management
   - Publishing and consuming messages
   - Queue and exchange operations
   - Channel pooling
   - Circuit breaker functionality
   - Cluster failover
   - Health checks
   - Metrics tracking
   - Error handling
   - Graceful shutdown

2. **Logger** (`logger.test.ts`)
   - All logging levels (fatal, error, warn, info, debug, trace)
   - OpenTelemetry integration
   - Metadata handling
   - Environment configuration
   - Error logging with stack traces

3. **Module Exports** (`index.test.ts`)
   - Default and named exports
   - Type exports

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests in CI Mode

```bash
npm run test:ci
```

### Run Specific Test File

```bash
npm test -- rabbit.test.ts
```

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="connect()"
```

## Test Coverage

The project maintains the following coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Coverage reports are generated in the `coverage/` directory:

- **Text**: Console output
- **LCOV**: `coverage/lcov.info` (for CI tools)
- **HTML**: `coverage/lcov-report/index.html` (detailed HTML report)

### View HTML Coverage Report

```bash
npm test -- --coverage
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

## Test Structure

### Directory Structure

```
src/
├── __tests__/
│   ├── setup.ts           # Jest setup and configuration
│   ├── rabbit.test.ts     # RabbitMQClient tests
│   ├── logger.test.ts     # Logger tests
│   └── index.test.ts      # Module exports tests
├── index.ts               # Main entry point
├── rabbit.ts              # RabbitMQ client implementation
└── logger.ts              # Logger implementation
```

### Test File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

## Writing Tests

### Basic Test Structure

```typescript
import RabbitMQClient from '../rabbit.js';

describe('Feature Name', () => {
  let client: RabbitMQClient;

  beforeEach(() => {
    // Setup
    client = new RabbitMQClient({ urls: ['amqp://localhost:5672'] });
  });

  afterEach(async () => {
    // Cleanup
    await client.close();
  });

  it('should do something', async () => {
    // Arrange
    const expected = 'value';

    // Act
    const result = await client.someMethod();

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Mocking

Tests use Jest mocks for external dependencies:

```typescript
jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));
```

### Async Testing

Always use async/await for asynchronous tests:

```typescript
it('should handle async operations', async () => {
  await expect(client.publish('ex', 'key', Buffer.from('data'))).resolves.not.toThrow();
});
```

### Testing Events

```typescript
it('should emit events', (done) => {
  client.on('connected', () => {
    expect(true).toBe(true);
    done();
  });

  client.connect();
});
```

### Testing Errors

```typescript
it('should throw error on invalid input', async () => {
  await expect(client.invalidOperation()).rejects.toThrow('Expected error message');
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up resources in `afterEach` or `afterAll`
3. **Descriptive Names**: Use clear, descriptive test names
4. **AAA Pattern**: Arrange, Act, Assert
5. **Mock External Dependencies**: Don't make actual network calls in unit tests
6. **Test Edge Cases**: Include tests for error conditions and edge cases
7. **Keep Tests Fast**: Unit tests should run quickly

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Debugging Tests

### Run Tests in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Use Chrome DevTools

1. Open `chrome://inspect` in Chrome
2. Click "inspect" on the Node process
3. Set breakpoints in your tests

### VSCode Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Integration Testing

For integration tests that require actual RabbitMQ:

```bash
# Start RabbitMQ with Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Run integration tests
npm run test:integration

# Stop RabbitMQ
docker stop rabbitmq && docker rm rabbitmq
```

## Troubleshooting

### Tests Timeout

Increase timeout in test or globally:

```typescript
// In specific test
it('long running test', async () => {
  // test code
}, 60000); // 60 second timeout

// Or in jest.config.js
testTimeout: 30000;
```

### Memory Leaks

If you see "Jest did not exit one second after the test run has completed":

1. Ensure all connections are closed
2. Clear all timers and intervals
3. Remove all event listeners

### Mock Issues

Clear mocks between tests:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [TypeScript with Jest](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
