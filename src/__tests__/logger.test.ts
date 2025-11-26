/**
 * @fileoverview Test suite for lightweight logger module
 */

import { trace, context, Span } from '@opentelemetry/api';

// Mock OpenTelemetry
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getSpan: jest.fn(),
  },
  context: {
    active: jest.fn(),
  },
}));

describe('Logger', () => {
  let logger: any;
  let mockSpan: Partial<Span>;
  let originalStdout: any;
  let originalStderr: any;
  let stdoutOutput: string[];
  let stderrOutput: string[];

  beforeEach(() => {
    // Reset modules to get fresh logger instance
    jest.resetModules();

    // Setup mock span
    mockSpan = {
      spanContext: jest.fn(() => ({
        traceId: 'test-trace-id',
        spanId: 'test-span-id',
        traceFlags: 1,
      })),
      addEvent: jest.fn(),
    };

    // Setup trace mock
    (trace.getSpan as jest.Mock).mockReturnValue(mockSpan);
    (context.active as jest.Mock).mockReturnValue({});

    // Capture stdout/stderr
    stdoutOutput = [];
    stderrOutput = [];

    originalStdout = process.stdout.write;
    originalStderr = process.stderr.write;

    process.stdout.write = jest.fn((chunk: string) => {
      stdoutOutput.push(chunk);
      return true;
    }) as any;

    process.stderr.write = jest.fn((chunk: string) => {
      stderrOutput.push(chunk);
      return true;
    }) as any;

    // Require logger after mocks are set up
    logger = require('../logger.js').default;
  });

  afterEach(() => {
    // Restore stdout/stderr
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    jest.clearAllMocks();
  });

  describe('Logger Methods', () => {
    it('should have all required logging methods', () => {
      expect(logger.fatal).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.trace).toBeDefined();
    });

    it('should log error messages to stderr', () => {
      logger.error('Test error message', 'testFunction');

      expect(stderrOutput.length).toBeGreaterThan(0);
      expect(stderrOutput[0]).toContain('ERROR');
      expect(stderrOutput[0]).toContain('Test error message');
      expect(stderrOutput[0]).toContain('fn=testFunction');
    });

    it('should log fatal messages to stderr', () => {
      logger.fatal('Test fatal message', 'testFunction');

      expect(stderrOutput.length).toBeGreaterThan(0);
      expect(stderrOutput[0]).toContain('FATAL');
      expect(stderrOutput[0]).toContain('Test fatal message');
    });

    it('should log info messages to stdout', () => {
      logger.info('Test info message', 'testFunction');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).toContain('INFO');
      expect(stdoutOutput[0]).toContain('Test info message');
      expect(stdoutOutput[0]).toContain('fn=testFunction');
    });

    it('should log warn messages to stdout', () => {
      logger.warn('Test warning', 'testFunction');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).toContain('WARN');
      expect(stdoutOutput[0]).toContain('Test warning');
    });

    it('should log debug messages to stdout', () => {
      logger.debug('Test debug', 'testFunction');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).toContain('DEBUG');
      expect(stdoutOutput[0]).toContain('Test debug');
    });

    it('should log trace messages to stdout', () => {
      logger.trace('Test trace', 'testFunction');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).toContain('TRACE');
      expect(stdoutOutput[0]).toContain('Test trace');
    });
  });

  describe('Log Message Format', () => {
    it('should include timestamp in ISO format', () => {
      logger.info('Test message', 'testFunction');

      expect(stdoutOutput[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include process PID', () => {
      logger.info('Test message', 'testFunction');

      expect(stdoutOutput[0]).toContain(`[${process.pid}]`);
    });

    it('should include log level', () => {
      logger.info('Test message', 'testFunction');

      expect(stdoutOutput[0]).toContain('INFO');
    });

    it('should include function name when provided', () => {
      logger.info('Test message', 'testFunction');

      expect(stdoutOutput[0]).toContain('fn=testFunction');
    });

    it('should not include function name when empty', () => {
      logger.info('Test message', '');

      expect(stdoutOutput[0]).not.toContain('fn=');
    });
  });

  describe('Metadata Handling', () => {
    it('should include metadata in log output', () => {
      const meta = { userId: 123, action: 'create' };
      logger.info('Test message', 'testFunction', meta);

      expect(stdoutOutput[0]).toContain('userId');
      expect(stdoutOutput[0]).toContain('123');
      expect(stdoutOutput[0]).toContain('action');
      expect(stdoutOutput[0]).toContain('create');
    });

    it('should handle complex metadata objects', () => {
      const meta = {
        user: { id: 123, name: 'John' },
        request: { method: 'POST', path: '/api/test' },
      };

      logger.info('Test message', 'testFunction', meta);

      expect(stdoutOutput[0]).toContain('user');
      expect(stdoutOutput[0]).toContain('request');
    });

    it('should handle circular references in metadata', () => {
      const meta: any = { name: 'test' };
      meta.self = meta; // Create circular reference

      expect(() => {
        logger.info('Test message', 'testFunction', meta);
      }).not.toThrow();

      expect(stdoutOutput[0]).toContain('[Circular]');
    });

    it('should work without metadata', () => {
      logger.info('Test message', 'testFunction');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).toContain('Test message');
    });
  });

  describe('OpenTelemetry Integration', () => {
    it('should include trace ID when span is available', () => {
      logger.info('Test message', 'testFunction');

      expect(stdoutOutput[0]).toContain('trace=test-trace-id');
      expect(stdoutOutput[0]).toContain('span=test-span-id');
    });

    it('should add event to span when available', () => {
      logger.info('Test message', 'testFunction', { extra: 'data' });

      expect(mockSpan.addEvent).toHaveBeenCalledWith('log', {
        level: 'info',
        message: 'Test message',
        functionName: 'testFunction',
        extra: 'data',
      });
    });

    it('should handle missing span gracefully', () => {
      (trace.getSpan as jest.Mock).mockReturnValue(null);

      expect(() => {
        logger.info('Test message', 'testFunction');
      }).not.toThrow();

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).not.toContain('trace=');
    });
  });

  describe('Log Levels', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.LOG_LEVEL;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.LOG_LEVEL = originalEnv;
      } else {
        delete process.env.LOG_LEVEL;
      }
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';
      jest.resetModules();
      const restrictiveLogger = require('../logger.js').default;

      // Capture new outputs
      stdoutOutput = [];
      stderrOutput = [];

      // Info should not be logged when level is error
      restrictiveLogger.info('Should not appear', 'test');
      expect(stdoutOutput.length).toBe(0);

      // Error should be logged
      restrictiveLogger.error('Should appear', 'test');
      expect(stderrOutput.length).toBeGreaterThan(0);
    });

    it('should use info as default log level', () => {
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      const defaultLogger = require('../logger.js').default;

      stdoutOutput = [];

      // Info should be logged with default level
      defaultLogger.info('Should appear', 'test');
      expect(stdoutOutput.length).toBeGreaterThan(0);

      // Debug should not be logged with default level
      stdoutOutput = [];
      defaultLogger.debug('Should not appear', 'test');
      expect(stdoutOutput.length).toBe(0);
    });
  });

  describe('Error Logging', () => {
    it('should log Error objects correctly', () => {
      const error = new Error('Test error');
      logger.error(error.message, 'testFunction', { error: error.message });

      expect(stderrOutput.length).toBeGreaterThan(0);
      expect(stderrOutput[0]).toContain('Test error');
    });

    it('should include error details in metadata', () => {
      const error = new Error('Test error');
      logger.error(error.message, 'testFunction', {
        error: error.message,
        stack: error.stack,
      });

      expect(stderrOutput[0]).toContain('error');
      expect(stderrOutput[0]).toContain('stack');
    });
  });

  describe('Function Name Tracking', () => {
    it('should include function name in log output', () => {
      logger.info('Test message', 'MyTestFunction');

      expect(stdoutOutput[0]).toContain('fn=MyTestFunction');
    });

    it('should handle empty function name', () => {
      logger.info('Test message', '');

      expect(stdoutOutput[0]).toContain('Test message');
      expect(stdoutOutput[0]).not.toContain('fn=');
    });

    it('should work without function name parameter', () => {
      logger.info('Test message');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(stdoutOutput[0]).toContain('Test message');
    });
  });

  describe('Process Signal Handlers', () => {
    it('should setup SIGTERM handler', () => {
      const listeners = process.listeners('SIGTERM');
      expect(listeners.length).toBeGreaterThan(0);
    });
  });

  describe('Output Streams', () => {
    it('should write errors to stderr', () => {
      logger.error('Error message', 'test');

      expect(process.stderr.write).toHaveBeenCalled();
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('should write fatal to stderr', () => {
      logger.fatal('Fatal message', 'test');

      expect(process.stderr.write).toHaveBeenCalled();
      expect(process.stdout.write).not.toHaveBeenCalled();
    });

    it('should write info to stdout', () => {
      logger.info('Info message', 'test');

      expect(process.stdout.write).toHaveBeenCalled();
      expect(process.stderr.write).not.toHaveBeenCalled();
    });

    it('should write warn to stdout', () => {
      logger.warn('Warn message', 'test');

      expect(process.stdout.write).toHaveBeenCalled();
      expect(process.stderr.write).not.toHaveBeenCalled();
    });
  });
});
