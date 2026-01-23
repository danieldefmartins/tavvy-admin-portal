import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import path from "path";

// ============================================================
// CORS Configuration - Environment-based allowlist
// ============================================================

// Parse allowed origins from environment variable
// Format: comma-separated list of origins
// Example: CORS_ALLOWED_ORIGINS=https://admin.tavvy.com,https://pros.tavvy.com
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
  const origins = envOrigins
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);
  
  // In development, allow localhost
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:5173');
    origins.push('http://127.0.0.1:3000');
    origins.push('http://127.0.0.1:5173');
  }
  
  console.log('[CORS] Allowed origins:', origins);
  return origins;
}

const ALLOWED_ORIGINS = getAllowedOrigins();

// ============================================================
// Rate Limiting - In-memory sliding window implementation
// ============================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;
}

function createRateLimiter(config: RateLimitConfig) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Get client identifier (IP address, with fallback)
    const clientIp = req.ip || 
      req.headers['x-forwarded-for']?.toString().split(',')[0] || 
      req.socket.remoteAddress || 
      'unknown';
    
    const key = `${clientIp}:${req.path}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    
    if (entry.count > config.maxRequests) {
      console.warn(`[RateLimit] Exceeded for ${clientIp} on ${req.path}`);
      return res.status(429).json({
        error: config.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }
    
    next();
  };
}

// Rate limiters for different endpoints
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  maxRequests: 10,  // 10 login attempts per 15 minutes
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,  // 100 requests per minute
  message: 'API rate limit exceeded. Please slow down.',
});

const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 20,  // 20 requests per minute for sensitive operations
  message: 'Rate limit exceeded for this operation.',
});

const app = express();

// Trust proxy for accurate IP detection behind Railway/load balancers
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    // These requests are authenticated via JWT in Authorization header, not cookies
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowlist
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject unknown origins
    console.warn(`[CORS] Rejected request from origin: ${origin}`);
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Apply rate limiting to auth endpoints (login)
app.use('/api/trpc/auth.login', authRateLimiter);

// Apply strict rate limiting to sensitive operations
app.use('/api/trpc/reviews.batchImport', strictRateLimiter);
app.use('/api/trpc/articles.bulkImport', strictRateLimiter);

// Apply general rate limiting to all API endpoints
app.use('/api/trpc', apiRateLimiter);

// Health check endpoint for API (no rate limiting)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root health check for Railway deployment (responds before static files)
app.get("/", (req, res, next) => {
  // If this is a health check (no Accept header for HTML), respond immediately
  const acceptHeader = req.headers.accept || '';
  if (!acceptHeader.includes('text/html')) {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  }
  // Otherwise, let it fall through to static file serving
  next();
});

// tRPC endpoint
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist", "public");
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
});

export { app };
