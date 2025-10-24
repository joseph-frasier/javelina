import cors from "cors";
import { env } from "../config/env";

/**
 * Configure CORS middleware
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // List of allowed origins
    const allowedOrigins = [
      env.frontendUrl,
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    if (allowedOrigins.includes(origin) || env.nodeEnv === "development") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600, // 10 minutes
});
