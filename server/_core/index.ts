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

const app = express();

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

// Health check endpoint for API
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
