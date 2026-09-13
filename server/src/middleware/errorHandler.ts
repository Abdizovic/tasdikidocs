import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

/**
 * Standard application error. Throw (or call next()) with an ApiError from
 * anywhere in a route/service and the centralized errorHandler below will
 * turn it into a consistent { error: { message, code } } JSON response.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST", details?: unknown) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }

  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }

  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
}

/**
 * 404 handler — mounted after all routers, before the error handler.
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      code: "ROUTE_NOT_FOUND",
    },
  });
}

/**
 * Centralized error-handling middleware. Must be registered last, after
 * all routers and the 404 handler. Never leaks stack traces (or raw
 * unexpected error messages) when NODE_ENV=production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const isProduction = process.env.NODE_ENV === "production";

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, code: err.code, path: req.originalUrl });
    } else {
      logger.warn(err.message, { code: err.code, path: req.originalUrl });
    }

    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  const error = err instanceof Error ? err : new Error("Unknown error");
  logger.error(error.message, { stack: error.stack, path: req.originalUrl });

  res.status(500).json({
    error: {
      message: isProduction ? "Internal server error" : error.message,
      code: "INTERNAL_ERROR",
      ...(isProduction ? {} : { stack: error.stack }),
    },
  });
}
