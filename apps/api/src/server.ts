import "./bootstrap.js";

import Fastify from "fastify";
import { config } from "./config";
import { registerPlugins } from "./plugins";
import { registerRoutes } from "./modules";

async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      transport:
        config.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss Z" },
            }
          : undefined,
    },
  });

  await registerPlugins(app);
  await registerRoutes(app);

  return app;
}

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();