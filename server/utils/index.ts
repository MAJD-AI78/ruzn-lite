/**
 * Ruzn-Lite Server Utilities
 * 
 * Exports sanitization, validation, and error handling utilities.
 */

// Sanitization
export {
  sanitizeForLLM,
  sanitizeForHTML,
  isArabicText,
  detectLanguage,
  validateInput,
  hasSQLInjection,
  validateFileMagicBytes
} from './sanitize';

// Validation schemas
export {
  chatMessageSchema,
  fileUploadSchema,
  complaintSchema,
  searchQuerySchema,
  userSchema,
  paginationSchema
} from './sanitize';

// Types from schemas
export type {
  ChatMessageInput,
  FileUploadInput,
  ComplaintInput,
  SearchQueryInput,
  UserInput,
  PaginationInput
} from './sanitize';

// Error handling
export {
  ErrorCodes,
  AppError,
  handleError,
  createError,
  logger,
  withErrorHandler,
  assertOrThrow,
  assertFound
} from './errorHandler';

export type { ErrorCode } from './errorHandler';
