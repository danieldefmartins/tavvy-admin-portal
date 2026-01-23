/**
 * Input Validation Module
 * 
 * Provides centralized input validation and sanitization functions
 * to prevent injection attacks and ensure data integrity.
 */

import { z } from "zod";

// ============================================================
// Common Validation Patterns
// ============================================================

// UUID pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Email pattern (more restrictive than default)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Safe string pattern (no special SQL/HTML characters)
const SAFE_STRING_REGEX = /^[a-zA-Z0-9\s\-_.,!?'"()]+$/;

// Alphanumeric only
const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]+$/;

// Slug pattern (URL-safe)
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ============================================================
// Zod Schemas for Common Types
// ============================================================

/**
 * UUID schema with validation
 */
export const uuidSchema = z.string().regex(UUID_REGEX, "Invalid UUID format");

/**
 * Email schema with validation
 */
export const emailSchema = z.string()
  .email("Invalid email format")
  .regex(EMAIL_REGEX, "Invalid email format")
  .max(254, "Email too long");

/**
 * Safe text schema (prevents injection)
 */
export const safeTextSchema = z.string()
  .min(1, "Text cannot be empty")
  .max(1000, "Text too long")
  .transform(val => sanitizeString(val));

/**
 * Search query schema
 */
export const searchQuerySchema = z.string()
  .min(1, "Search query cannot be empty")
  .max(200, "Search query too long")
  .transform(val => sanitizeSearchQuery(val));

/**
 * Slug schema
 */
export const slugSchema = z.string()
  .min(1, "Slug cannot be empty")
  .max(100, "Slug too long")
  .regex(SLUG_REGEX, "Invalid slug format");

/**
 * Positive integer schema
 */
export const positiveIntSchema = z.number()
  .int("Must be an integer")
  .positive("Must be positive")
  .max(Number.MAX_SAFE_INTEGER, "Number too large");

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * URL schema
 */
export const urlSchema = z.string()
  .url("Invalid URL format")
  .max(2048, "URL too long")
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://'),
    "URL must start with http:// or https://"
  );

/**
 * Phone number schema (international format)
 */
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .max(16, "Phone number too long");

// ============================================================
// Sanitization Functions
// ============================================================

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize a search query for safe database use
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  return query
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape SQL wildcards
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Remove potentially dangerous characters
    .replace(/[;'"\\]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
    // Limit length
    .substring(0, 200);
}

/**
 * Sanitize HTML content (basic XSS prevention)
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs (potential XSS vector)
    .replace(/data:/gi, '')
    // Encode remaining HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize a UUID
 */
export function validateUuid(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim().toLowerCase();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Validate and sanitize an email
 */
export function validateEmail(input: string): string | null {
  if (!input) return null;
  
  const trimmed = input.trim().toLowerCase();
  if (EMAIL_REGEX.test(trimmed) && trimmed.length <= 254) {
    return trimmed;
  }
  return null;
}

/**
 * Validate a positive integer
 */
export function validatePositiveInt(input: unknown): number | null {
  const num = Number(input);
  if (Number.isInteger(num) && num > 0 && num <= Number.MAX_SAFE_INTEGER) {
    return num;
  }
  return null;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit: unknown,
  offset: unknown,
  maxLimit: number = 200
): { limit: number; offset: number } {
  const validLimit = Math.min(
    Math.max(1, validatePositiveInt(limit) || 50),
    maxLimit
  );
  const validOffset = Math.max(0, validatePositiveInt(offset) || 0);
  
  return { limit: validLimit, offset: validOffset };
}

// ============================================================
// Validation Middleware Helpers
// ============================================================

/**
 * Create a validated input object or throw an error
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  return result.data;
}

/**
 * Check if a string contains potential SQL injection patterns
 */
export function hasSqlInjectionPatterns(input: string): boolean {
  if (!input) return false;
  
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--|#|\/\*)/,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
    /'\s*(OR|AND)\s+'/i,
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
  ];
  
  return patterns.some(pattern => pattern.test(input));
}

/**
 * Check if a string contains potential XSS patterns
 */
export function hasXssPatterns(input: string): boolean {
  if (!input) return false;
  
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /expression\s*\(/i,
  ];
  
  return patterns.some(pattern => pattern.test(input));
}
