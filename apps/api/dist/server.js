"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const config_1 = require("./config");
const plugins_1 = require("./plugins");
const modules_1 = require("./modules");
async function buildServer() {
    const app = (0, fastify_1.default)({
        logger: {
            level: config_1.config.NODE_ENV === "production" ? "info" : "debug",
            transport: config_1.config.NODE_ENV !== "production"
                ? {
                    target: "pino-pretty",
                    options: { colorize: true, translateTime: "HH:MM:ss Z" },
                }
                : undefined,
        },
    });
    await (0, plugins_1.registerPlugins)(app);
    await (0, modules_1.registerRoutes)(app);
    return app;
}
async function start() {
    try {
        const app = await buildServer();
        await app.listen({ port: config_1.config.PORT, host: "0.0.0.0" });
        console.log(`🚀 Server running on http://localhost:${config_1.config.PORT}`);
    }
    catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}
start();
