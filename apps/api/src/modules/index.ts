import { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth";
import { registerProfileRoutes } from "./profile";
import { registerMembershipRoutes } from "./membership";
import { registerPostRoutes } from "./posts";
import { registerDiscoverRoutes } from "./discover";
import { registerMessageRoutes } from "./messages";
import { registerSettingsRoutes } from "./settings";

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // API routes
  await registerAuthRoutes(app);
  await registerProfileRoutes(app);
  await registerMembershipRoutes(app);
  await registerPostRoutes(app);
  await registerDiscoverRoutes(app);
  await registerMessageRoutes(app);
  await registerSettingsRoutes(app);

  // 404 handler
  app.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      success: false,
      error: { code: "NOT_FOUND", message: `Route ${request.method} ${request.url} not found` },
    });
  });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error(error);

    // Validation errors
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.validation,
        },
      });
    }

    // Default error
    return reply.code(500).send({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    });
  });
}