import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { logger } from "./lib/logger";
import { apiLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import apiRouter from "./routes";

export function createApp() {
  const app = express();

  // Trust the first proxy hop (relevant once deployed behind a load
  // balancer / reverse proxy) so req.ip and rate limiting behave correctly.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
    })
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      // Default permissive in dev when unset; in production CORS_ORIGIN
      // should always be set to the real app origin(s).
      origin: corsOrigin ? corsOrigin.split(",").map((o) => o.trim()) : "*",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Request logging.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
    });
    next();
  });

  // Health check — no auth, no rate limit, used by uptime monitors.
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1", apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
