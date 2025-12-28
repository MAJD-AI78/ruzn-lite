/**
 * Ruzn-Lite Error Handler
 * 
 * Centralized error handling with:
 * - Consistent error codes
 * - Logging with correlation IDs
 * - tRPC error mapping
 */

import { TRPCError } from '@trpc/server';

// ═══════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════

export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // External Services
  LLM_ERROR: 'LLM_ERROR',
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  LLM_RATE_LIMITED: 'LLM_RATE_LIMITED',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  
  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ═══════════════════════════════════════════════════════════════
// CUSTOM ERROR CLASS
// ═══════════════════════════════════════════════════════════════

export class AppError extends Error {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.correlationId = generateCorrelationId();
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      ...(this.details && { details: this.details })
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR MAPPING
// ═══════════════════════════════════════════════════════════════

const errorCodeToTRPCCode: Record<ErrorCode, any> = {
  [ErrorCodes.UNAUTHORIZED]: 'UNAUTHORIZED',
  [ErrorCodes.FORBIDDEN]: 'FORBIDDEN',
  [ErrorCodes.SESSION_EXPIRED]: 'UNAUTHORIZED',
  [ErrorCodes.VALIDATION_ERROR]: 'BAD_REQUEST',
  [ErrorCodes.INVALID_INPUT]: 'BAD_REQUEST',
  [ErrorCodes.NOT_FOUND]: 'NOT_FOUND',
  [ErrorCodes.ALREADY_EXISTS]: 'CONFLICT',
  [ErrorCodes.RATE_LIMITED]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.QUOTA_EXCEEDED]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.LLM_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.LLM_TIMEOUT]: 'TIMEOUT',
  [ErrorCodes.LLM_RATE_LIMITED]: 'TOO_MANY_REQUESTS',
  [ErrorCodes.DATABASE_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.CONNECTION_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.TRANSACTION_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.FILE_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [ErrorCodes.INVALID_FILE_TYPE]: 'BAD_REQUEST',
  [ErrorCodes.FILE_UPLOAD_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.INTERNAL_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'INTERNAL_SERVER_ERROR',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'INTERNAL_SERVER_ERROR'
};

const errorCodeToStatusCode: Record<ErrorCode, number> = {
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.SESSION_EXPIRED]: 401,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.QUOTA_EXCEEDED]: 429,
  [ErrorCodes.LLM_ERROR]: 500,
  [ErrorCodes.LLM_TIMEOUT]: 504,
  [ErrorCodes.LLM_RATE_LIMITED]: 429,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.CONNECTION_ERROR]: 503,
  [ErrorCodes.TRANSACTION_ERROR]: 500,
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.INVALID_FILE_TYPE]: 400,
  [ErrorCodes.FILE_UPLOAD_ERROR]: 500,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502
};

// ═══════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  correlationId?: string;
  context?: string;
  error?: any;
  metadata?: Record<string, any>;
  timestamp: string;
}

export const logger = {
  debug(message: string, metadata?: Record<string, any>) {
    log('debug', message, metadata);
  },
  
  info(message: string, metadata?: Record<string, any>) {
    log('info', message, metadata);
  },
  
  warn(message: string, metadata?: Record<string, any>) {
    log('warn', message, metadata);
  },
  
  error(message: string, error?: any, metadata?: Record<string, any>) {
    log('error', message, { ...metadata, error });
  }
};

function log(level: LogLevel, message: string, metadata?: Record<string, any>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  // In production, send to logging service (e.g., Sentry, CloudWatch)
  // For now, use console with structured output
  const output = JSON.stringify(entry);
  
  switch (level) {
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(output);
      }
      break;
    case 'info':
      console.info(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Handle error and convert to tRPC error
 */
export function handleError(error: unknown, context?: string): never {
  // Already a TRPCError
  if (error instanceof TRPCError) {
    logger.warn(error.message, { 
      context, 
      code: error.code 
    });
    throw error;
  }
  
  // Our custom AppError
  if (error instanceof AppError) {
    logger.error(error.message, error, { 
      context,
      correlationId: error.correlationId,
      code: error.code
    });
    
    throw new TRPCError({
      code: errorCodeToTRPCCode[error.code] || 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error
    });
  }
  
  // Unknown error - log full details but return generic message
  const correlationId = generateCorrelationId();
  
  logger.error('Unhandled error', error, { 
    context,
    correlationId 
  });
  
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `An unexpected error occurred. Reference: ${correlationId}`
  });
}

/**
 * Create an AppError with proper code
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): AppError {
  return new AppError(
    code,
    message,
    errorCodeToStatusCode[code],
    true,
    details
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
    }
  }) as T;
}

/**
 * Assert condition or throw error
 */
export function assertOrThrow(
  condition: boolean,
  code: ErrorCode,
  message: string
): asserts condition {
  if (!condition) {
    throw createError(code, message);
  }
}

/**
 * Assert value exists or throw NOT_FOUND
 */
export function assertFound<T>(
  value: T | null | undefined,
  resourceName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw createError(
      ErrorCodes.NOT_FOUND,
      `${resourceName} not found`
    );
  }
}
