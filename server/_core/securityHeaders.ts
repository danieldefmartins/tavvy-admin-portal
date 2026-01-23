/**
 * Security Headers Middleware
 * 
 * Adds security-related HTTP headers to all responses.
 * These headers help protect against common web vulnerabilities.
 */

import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersConfig {
  // Content Security Policy
  enableCSP?: boolean;
  cspDirectives?: Record<string, string[]>;
  
  // HTTP Strict Transport Security
  enableHSTS?: boolean;
  hstsMaxAge?: number;
  hstsIncludeSubDomains?: boolean;
  hstsPreload?: boolean;
  
  // Other headers
  enableXFrameOptions?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN';
  enableXContentTypeOptions?: boolean;
  enableXXSSProtection?: boolean;
  enableReferrerPolicy?: boolean;
  referrerPolicy?: string;
}

const defaultConfig: SecurityHeadersConfig = {
  enableCSP: true,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for React dev
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
  },
  enableHSTS: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  hstsPreload: false,
  enableXFrameOptions: true,
  xFrameOptions: 'DENY',
  enableXContentTypeOptions: true,
  enableXXSSProtection: true,
  enableReferrerPolicy: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
};

/**
 * Build CSP header value from directives
 */
function buildCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Build HSTS header value
 */
function buildHSTSHeader(config: SecurityHeadersConfig): string {
  let value = `max-age=${config.hstsMaxAge}`;
  if (config.hstsIncludeSubDomains) {
    value += '; includeSubDomains';
  }
  if (config.hstsPreload) {
    value += '; preload';
  }
  return value;
}

/**
 * Create security headers middleware
 */
export function securityHeaders(customConfig?: Partial<SecurityHeadersConfig>) {
  const config = { ...defaultConfig, ...customConfig };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Content Security Policy
    if (config.enableCSP && config.cspDirectives) {
      const cspHeader = buildCSPHeader(config.cspDirectives);
      res.setHeader('Content-Security-Policy', cspHeader);
    }
    
    // HTTP Strict Transport Security (only in production)
    if (config.enableHSTS && process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', buildHSTSHeader(config));
    }
    
    // X-Frame-Options - Prevent clickjacking
    if (config.enableXFrameOptions) {
      res.setHeader('X-Frame-Options', config.xFrameOptions || 'DENY');
    }
    
    // X-Content-Type-Options - Prevent MIME sniffing
    if (config.enableXContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // X-XSS-Protection - Legacy XSS protection
    if (config.enableXXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }
    
    // Referrer-Policy - Control referrer information
    if (config.enableReferrerPolicy) {
      res.setHeader('Referrer-Policy', config.referrerPolicy || 'strict-origin-when-cross-origin');
    }
    
    // Permissions-Policy - Restrict browser features
    res.setHeader('Permissions-Policy', 
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );
    
    // Remove X-Powered-By header (information disclosure)
    res.removeHeader('X-Powered-By');
    
    next();
  };
}

/**
 * Pre-configured security headers for admin portal
 */
export const adminPortalSecurityHeaders = securityHeaders({
  enableCSP: true,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.stripe.com',
    ],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
  },
  xFrameOptions: 'DENY',
});
