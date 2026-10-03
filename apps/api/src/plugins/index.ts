import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { config } from "../config.js";

interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
  membershipStatus: "pending" | "approved" | "rejected" | "suspended" | null;
  createdAt: Date;
  updatedAt: Date;
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export async function registerPlugins(app: FastifyInstance) {
  // Dynamic imports to ensure dotenv is loaded first
  const { db } = await import("../db/index.js");
  const { users, membershipApplications } = await import("../db/schema.js");
  const { eq } = await import("drizzle-orm");

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    keyGenerator: (req) => req.ip,
  });

  // JWT - Access token
  await app.register(jwt, {
    secret: config.JWT_ACCESS_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_EXPIRES_IN },
    verify: { algorithms: ["HS256"] },
  });

  // JWT - Refresh token (separate secret, namespace)
  await app.register(jwt, {
    secret: config.JWT_REFRESH_SECRET,
    sign: { expiresIn: config.JWT_REFRESH_EXPIRES_IN },
    verify: { algorithms: ["HS256"] },
    namespace: "refresh",
  });

  // Auth decorators
  app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
  });

  app.decorate("requireAdmin", async function (request: FastifyRequest, reply: FastifyReply) {
    await this.authenticate(request, reply);
    if (!request.authUser || request.authUser.role !== "admin") {
      return reply.code(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "Admin access required" },
      });
    }
  });

  app.decorate("requireApproved", async function (request: FastifyRequest, reply: FastifyReply) {
    await this.authenticate(request, reply);
    if (!request.authUser || request.authUser.membershipStatus !== "approved") {
      return reply.code(403).send({
        success: false,
        error: {
          code: "MEMBERSHIP_REQUIRED",
          message: "Approved membership required",
          details: { status: request.authUser?.membershipStatus },
        },
      });
    }
  });

  app.decorate("getCurrentUser", async function (request: FastifyRequest): Promise<AuthUser | null> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    try {
      const token = authHeader.substring(7);
      const decoded = app.jwt.verify(token) as any;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.sub))
        .limit(1);

      if (!user) return null;

      const [application] = await db
        .select({ status: membershipApplications.status })
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, user.id))
        .limit(1);

      return {
        ...user,
        membershipStatus: application?.status || "pending",
      };
    } catch {
      return null;
    }
  });

  app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await app.getCurrentUser(request);
    if (user) {
      request.authUser = user;
    }
  });
}

interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
  membershipStatus: "pending" | "approved" | "rejected" | "suspended" | null;
  createdAt: Date;
  updatedAt: Date;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireApproved: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    getCurrentUser: (request: FastifyRequest) => Promise<AuthUser | null>;
    refresh: {
      jwt: {
        sign: (payload: object, options?: any) => string;
        verify: (token: string) => any;
      };
    };
  }

  interface FastifyRequest {
    authUser?: AuthUser;
  }
}