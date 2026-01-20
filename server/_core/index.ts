import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import path from "path";

const app = express();

// Middleware
app.use(cors({
  origin: true,
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
