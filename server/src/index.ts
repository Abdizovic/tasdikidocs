import "dotenv/config";

import { createApp } from "./app";
import { logger } from "./lib/logger";

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`TasdikiDocs server listening on port ${PORT} (env: ${process.env.NODE_ENV || "development"})`);
});

function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      logger.error("Error during server shutdown", { error: err.message });
      process.exit(1);
    }
    logger.info("Server closed. Bye.");
    process.exit(0);
  });

  // Force-exit if shutdown hangs.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { message: err.message, stack: err.stack });
  process.exit(1);
});
