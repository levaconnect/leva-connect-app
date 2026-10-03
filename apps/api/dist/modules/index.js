"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const auth_1 = require("./auth");
const profile_1 = require("./profile");
const membership_1 = require("./membership");
const posts_1 = require("./posts");
const discover_1 = require("./discover");
const messages_1 = require("./messages");
const settings_1 = require("./settings");
async function registerRoutes(app) {
    // Health check
    app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
    // API routes
    await (0, auth_1.registerAuthRoutes)(app);
    await (0, profile_1.registerProfileRoutes)(app);
    await (0, membership_1.registerMembershipRoutes)(app);
    await (0, posts_1.registerPostRoutes)(app);
    await (0, discover_1.registerDiscoverRoutes)(app);
    await (0, messages_1.registerMessageRoutes)(app);
    await (0, settings_1.registerSettingsRoutes)(app);
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
