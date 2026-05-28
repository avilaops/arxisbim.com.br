/**
 * Error handling and logging module
 */

export { ErrorHandler, errorHandler } from './ErrorHandler';
export { ErrorSeverity, ErrorCategory } from './ErrorHandler';
export type { ErrorContext, ErrorRecoveryStrategy, ErrorHandlerConfig } from './ErrorHandler';

export { RetryPolicy } from './RetryPolicy';
export type { RetryConfig, RetryResult } from './RetryPolicy';

export { Logger, logger, ContextLogger } from './Logger';
export { LogLevel } from './Logger';
export type { LogEntry, LoggerConfig } from './Logger';
