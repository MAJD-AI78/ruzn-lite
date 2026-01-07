import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { handleStreamingChat } from "../streamingChat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// Parse allowed origins from environment variable (comma-separated)
function getAllowedOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS || "";
  const origins = corsOrigins
    .split(",")
    .map(o => o.trim())
    .filter(o => o.length > 0);
  
  // Allow localhost only in genuine development mode
  // Check both NODE_ENV and that we're not in a production-like environment
  const isDevelopment = process.env.NODE_ENV === "development" && !process.env.RAILWAY_ENVIRONMENT && !process.env.VERCEL;
  if (isDevelopment) {
    origins.push("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173");
  }
  
  return origins;
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  
  // If no origins configured, allow all in development only
  if (allowedOrigins.length === 0 && process.env.NODE_ENV === "development") {
    return true;
  }
  
  return allowedOrigins.some(allowed => {
    // Support wildcard subdomains (e.g., *.vercel.app)
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2);
      // Must match exactly ".domain" to prevent "evilvercel.app" from matching "*.vercel.app"
      return origin.endsWith("." + domain);
    }
    return origin === allowed;
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Security headers middleware
  app.use((req, res, next) => {
    // Strict Transport Security - force HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    // Content Security Policy - allowing necessary resources
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https://api.manus.im https://forge.manus.im wss: https:; " +
      "frame-ancestors 'self';"
    );
    next();
  });
  
  // CORS middleware for split deployment (Vercel frontend + Railway backend)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if the origin is allowed (origin must be defined if isOriginAllowed returns true)
    if (origin && isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    next();
  });
  
  // Health check endpoint for Railway/deployment monitoring
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Streaming chat endpoint (SSE)
  app.post("/api/chat/stream", handleStreamingChat);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // API-only mode (for split deployment with separate frontend)
  const apiOnlyMode = process.env.API_ONLY === "true";
  
  if (apiOnlyMode) {
    // In API-only mode, don't serve static files
    // The frontend is hosted separately (e.g., on Vercel)
    console.log("Running in API-only mode - frontend is served separately");
  } else if (process.env.NODE_ENV === "development") {
    // Development mode uses Vite dev server
    await setupVite(app, server);
  } else {
    // Production monolithic mode serves static files
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
