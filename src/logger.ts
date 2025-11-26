/**
 * @fileoverview Lightweight logger using Node.js standard libraries
 * @module logger
 */

import { trace, context } from '@opentelemetry/api';

/**
 * Log levels with numeric priorities
 */
const LOG_LEVELS = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Current log level from environment or default to 'info'
 */
const currentLevel: LogLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
// eslint-disable-next-line security/detect-object-injection
const currentLevelValue = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.info;

/**
 * Check if a log level should be logged based on current level
 */
function shouldLog(level: LogLevel): boolean {
  // eslint-disable-next-line security/detect-object-injection
  return LOG_LEVELS[level] <= currentLevelValue;
}

/**
 * Format timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get trace context if available
 */
function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }
  return {};
}

/**
 * Format log message in Node.js style
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  functionName: string,
  meta?: object,
): string {
  const timestamp = getTimestamp();
  const { traceId, spanId } = getTraceContext();
  const pid = process.pid;

  // Build metadata string
  const metaParts: string[] = [];

  if (functionName) {
    metaParts.push(`fn=${functionName}`);
  }

  if (traceId) {
    metaParts.push(`trace=${traceId}`);
  }

  if (spanId) {
    metaParts.push(`span=${spanId}`);
  }

  if (meta && Object.keys(meta).length > 0) {
    try {
      metaParts.push(JSON.stringify(meta));
    } catch {
      metaParts.push('[Circular]');
    }
  }

  const metaString = metaParts.length > 0 ? ` ${metaParts.join(' ')}` : '';

  // Format: timestamp [PID] LEVEL: message metadata
  return `${timestamp} [${pid}] ${level.toUpperCase()}: ${message}${metaString}`;
}

/**
 * Write log to stderr (for errors) or stdout
 */
function writeLog(level: LogLevel, formattedMessage: string): void {
  if (level === 'error' || level === 'fatal') {
    process.stderr.write(formattedMessage + '\n');
  } else {
    process.stdout.write(formattedMessage + '\n');
  }
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, functionName: string, meta?: object): void {
  if (!shouldLog(level)) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, functionName, meta);
  writeLog(level, formattedMessage);

  // Add event to OpenTelemetry span if available
  const span = trace.getSpan(context.active());
  if (span) {
    span.addEvent('log', {
      level,
      message,
      functionName,
      ...meta,
    });
  }
}

/**
 * Lightweight logger interface
 */
const logger = {
  /**
   * Log fatal error (process should exit)
   */
  fatal(message: string, functionName: string = '', meta?: object): void {
    log('fatal', message, functionName, meta);
  },

  /**
   * Log error message
   */
  error(message: string, functionName: string = '', meta?: object): void {
    log('error', message, functionName, meta);
  },

  /**
   * Log warning message
   */
  warn(message: string, functionName: string = '', meta?: object): void {
    log('warn', message, functionName, meta);
  },

  /**
   * Log info message
   */
  info(message: string, functionName: string = '', meta?: object): void {
    log('info', message, functionName, meta);
  },

  /**
   * Log debug message
   */
  debug(message: string, functionName: string = '', meta?: object): void {
    log('debug', message, functionName, meta);
  },

  /**
   * Log trace message (very verbose)
   */
  trace(message: string, functionName: string = '', meta?: object): void {
    log('trace', message, functionName, meta);
  },
};

// Graceful shutdown handler - use once() to avoid duplicate handlers
process.once('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.', 'GracefulShutdown');
  setTimeout(() => process.exit(0), 1000);
});

export default logger;
