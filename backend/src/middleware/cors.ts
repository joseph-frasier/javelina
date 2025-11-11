import cors from "cors";
import { env } from "../config/env";

/**
 * Configure CORS middleware
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Build allowed origins based on environment
    const allowedOrigins: string[] = [];
    
    // Always add the configured frontend URL
    allowedOrigins.push(env.frontendUrl);
    
    // In development, also allow localhost variants
    if (env.nodeEnv === "development") {
      allowedOrigins.push(
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
      );
    }

    // Log for debugging in development
    if (env.nodeEnv === "development") {
      console.log(`CORS check: origin=${origin}, allowed=${allowedOrigins.join(", ")}`);
    }

    // Handle requests with no origin header
    if (!origin) {
      // In development, allow no-origin requests (for Postman, curl, etc.)
      if (env.nodeEnv === "development") {
        return callback(null, true);
      }
      // In production, reject no-origin requests for security
      console.warn('CORS blocked: No origin header in production');
      return callback(new Error('Origin header required'));
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600, // 10 minutes
});
