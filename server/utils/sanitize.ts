/**
 * Ruzn-Lite Input Sanitization Utilities
 * 
 * Provides input validation and sanitization for:
 * - LLM prompt injection prevention
 * - XSS prevention
 * - File upload validation
 */

import { z } from 'zod';

/**
 * Sanitize user text before sending to LLM
 * Prevents prompt injection attacks
 */
export function sanitizeForLLM(text: string): string {
  let sanitized = text;
  
  // Remove common prompt injection patterns
  const injectionPatterns = [
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<<SYS>>/gi,
    /<<\/SYS>>/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /\[SYSTEM\]/gi,
    /\[\/SYSTEM\]/gi,
    /```system/gi,
    /```assistant/gi,
  ];
  
  injectionPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Neutralize role markers (replace with similar-looking text)
  sanitized = sanitized
    .replace(/system:/gi, 'System:')
    .replace(/assistant:/gi, 'Assistant:')
    .replace(/human:/gi, 'Human:')
    .replace(/user:/gi, 'User:');
  
  // Remove HTML/script tags
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
  
  // Normalize whitespace (but preserve newlines for readability)
  sanitized = sanitized
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return sanitized;
}

/**
 * Sanitize for HTML output (XSS prevention)
 */
export function sanitizeForHTML(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, char => htmlEntities[char]);
}

/**
 * Check if text contains Arabic characters
 */
export function isArabicText(text: string): boolean {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && arabicChars / totalChars > 0.3;
}

/**
 * Detect language of text
 */
export function detectLanguage(text: string): 'arabic' | 'english' {
  return isArabicText(text) ? 'arabic' : 'english';
}

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Chat message schema with sanitization
 */
export const chatMessageSchema = z.object({
  message: z.string()
    .min(15, 'Message must be at least 15 characters')
    .max(10000, 'Message must be under 10,000 characters')
    .transform(sanitizeForLLM),
  
  language: z.enum(['arabic', 'english']),
  
  feature: z.enum(['complaints', 'legislative']),
  
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(50000).transform(sanitizeForLLM)
  }))
    .max(20, 'Maximum 20 messages in history')
    .default([])
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

/**
 * File upload schema
 */
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .regex(
      /^[a-zA-Z0-9_\-\.\u0600-\u06FF\s]+$/,
      'Invalid characters in filename'
    )
    .transform(name => name.trim()),
  
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ] as const, {
    message: 'Only PDF, DOCX, and TXT files are allowed'
  }),
  
  size: z.number()
    .max(10 * 1024 * 1024, 'File must be under 10MB'),
  
  content: z.string() // Base64 encoded
    .min(1, 'File content is required')
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

/**
 * Complaint submission schema
 */
export const complaintSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be under 200 characters')
    .transform(sanitizeForHTML),
  
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(10000, 'Description must be under 10,000 characters')
    .transform(text => sanitizeForLLM(sanitizeForHTML(text))),
  
  entityName: z.string()
    .min(2, 'Entity name is required')
    .max(200)
    .transform(sanitizeForHTML),
  
  category: z.enum([
    'embezzlement',
    'bribery',
    'conflict_of_interest',
    'abuse_of_power',
    'forgery',
    'tender_violation',
    'negligence',
    'failure_to_report',
    'general'
  ]),
  
  estimatedAmount: z.number()
    .min(0)
    .max(1000000000) // 1 billion max
    .optional(),
  
  attachments: z.array(fileUploadSchema).max(5).optional(),
  
  anonymous: z.boolean().default(false),
  
  contactEmail: z.string().email().optional().nullable(),
  
  contactPhone: z.string()
    .regex(/^[+]?[\d\s-]{8,20}$/, 'Invalid phone number')
    .optional()
    .nullable()
});

export type ComplaintInput = z.infer<typeof complaintSchema>;

/**
 * Search query schema
 */
export const searchQuerySchema = z.object({
  query: z.string()
    .min(2, 'Search query too short')
    .max(500, 'Search query too long')
    .transform(text => text.trim()),
  
  category: z.enum([
    'law',
    'regulation',
    'policy',
    'procedure',
    'report',
    'guideline'
  ]).optional(),
  
  language: z.enum(['arabic', 'english', 'both']).default('both'),
  
  limit: z.number().min(1).max(50).default(10),
  
  offset: z.number().min(0).default(0)
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

/**
 * User registration/update schema
 */
export const userSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .transform(sanitizeForHTML),
  
  nameArabic: z.string()
    .max(100)
    .transform(sanitizeForHTML)
    .optional(),
  
  role: z.enum(['admin', 'analyst', 'viewer']).default('viewer'),
  
  department: z.string()
    .max(100)
    .transform(sanitizeForHTML)
    .optional()
});

export type UserInput = z.infer<typeof userSchema>;

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate and parse input with schema
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map((e) => 
    `${e.path.join('.')}: ${e.message}`
  );
  
  return { success: false, errors };
}

/**
 * Check for potential SQL injection patterns
 */
export function hasSQLInjection(text: string): boolean {
  const sqlPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)(\s|$)/i,
    /(\s|^)(UNION|JOIN)(\s+)(SELECT|ALL)/i,
    /--/,
    /;.*$/,
    /\/\*.*\*\//,
    /'.*OR.*'.*=/i,
    /".*OR.*".*=/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(text));
}

/**
 * Validate file magic bytes (first few bytes identify file type)
 */
export function validateFileMagicBytes(
  base64Content: string,
  expectedType: string
): boolean {
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const header = buffer.slice(0, 8).toString('hex').toUpperCase();
    
    const magicBytes: Record<string, string[]> = {
      'application/pdf': ['25504446'], // %PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '504B0304', // PK (ZIP header for DOCX)
        '504B0506',
        '504B0708'
      ]
    };
    
    const expected = magicBytes[expectedType];
    if (!expected) return true; // Unknown type, allow
    
    return expected.some(magic => header.startsWith(magic));
  } catch {
    return false;
  }
}
