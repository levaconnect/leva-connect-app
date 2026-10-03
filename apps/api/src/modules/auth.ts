import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, membershipApplications, profiles } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { hash, verify } from "argon2";
import { config } from "../config.js";
import {
  RegisterSchema,
  LoginSchema,
  AuthTokensSchema,
  UserSchema,
  JWTPayloadSchema,
  MembershipStatusSchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

export async function registerAuthRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post(
    "/auth/register",
    {
      config: { rateLimit: { max: config.AUTH_RATE_LIMIT_MAX, timeWindow: config.AUTH_RATE_LIMIT_WINDOW } },
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "fullName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8, maxLength: 128 },
            fullName: { type: "string", minLength: 2, maxLength: 100 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean", const: true },
              data: {
                type: "object",
                properties: {
                  accessToken: { type: "string" },
                  refreshToken: { type: "string" },
                  expiresIn: { type: "number" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              success: { type: "boolean", const: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
          409: {
            type: "object",
            properties: {
              success: { type: "boolean", const: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, fullName } = request.body as z.infer<typeof RegisterSchema>;

      // Check if user exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing) {
        return reply.code(409).send(
          createApiError("EMAIL_EXISTS", "An account with this email already exists")
        );
      }

      // Hash password
      const passwordHash = await hash(password, { type: 2 }); // Argon2id

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          role: "user",
        })
        .returning();

      // Create empty profile
      await db.insert(profiles).values({
        userId: user.id,
        fullName,
        interests: [],
      });

      // Create pending membership application
      await db.insert(membershipApplications).values({
        userId: user.id,
        status: "pending",
      });

      // Generate tokens
      const accessToken = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, membershipStatus: "pending" });
      const refreshToken = app.refresh.jwt.sign({ sub: user.id, email: user.email, role: user.role });

      return reply.code(201).send(
        createApiSuccess({ accessToken, refreshToken, expiresIn: 900 })
      );
    }
  );

  // POST /auth/login
  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: config.AUTH_RATE_LIMIT_MAX, timeWindow: config.AUTH_RATE_LIMIT_WINDOW } },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean", const: true },
              data: {
                type: "object",
                properties: {
                  accessToken: { type: "string" },
                  refreshToken: { type: "string" },
                  expiresIn: { type: "number" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              success: { type: "boolean", const: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as z.infer<typeof LoginSchema>;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        return reply.code(401).send(
          createApiError("INVALID_CREDENTIALS", "Invalid email or password")
        );
      }

      const valid = await verify(user.passwordHash, password);
      if (!valid) {
        return reply.code(401).send(
          createApiError("INVALID_CREDENTIALS", "Invalid email or password")
        );
      }

      // Get membership status
      const [application] = await db
        .select({ status: membershipApplications.status })
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, user.id))
        .limit(1);

      const membershipStatus = application?.status || "pending";

      const accessToken = app.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        membershipStatus,
      });
      const refreshToken = app.refresh.jwt.sign({ sub: user.id, email: user.email, role: user.role });

      return reply.send(
        createApiSuccess({ accessToken, refreshToken, expiresIn: 900 })
      );
    }
  );

  // POST /auth/refresh
  app.post(
    "/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean", const: true },
              data: {
                type: "object",
                properties: {
                  accessToken: { type: "string" },
                  refreshToken: { type: "string" },
                  expiresIn: { type: "number" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              success: { type: "boolean", const: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };

      try {
        const decoded = app.refresh.jwt.verify(refreshToken) as any;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.sub))
          .limit(1);

        if (!user) {
          return reply.code(401).send(
            createApiError("INVALID_TOKEN", "Invalid refresh token")
          );
        }

        // Get membership status
        const [application] = await db
          .select({ status: membershipApplications.status })
          .from(membershipApplications)
          .where(eq(membershipApplications.userId, user.id))
          .limit(1);

        const membershipStatus = application?.status || "pending";

        const accessToken = app.jwt.sign({
          sub: user.id,
          email: user.email,
          role: user.role,
          membershipStatus,
        });
        const newRefreshToken = app.refresh.jwt.sign({ sub: user.id, email: user.email, role: user.role });

        return reply.send(
          createApiSuccess({ accessToken, refreshToken: newRefreshToken, expiresIn: 900 })
        );
      } catch {
        return reply.code(401).send(
          createApiError("INVALID_TOKEN", "Invalid or expired refresh token")
        );
      }
    }
  );

  // POST /auth/logout
  app.post(
    "/auth/logout",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      // In a production app, you'd add the refresh token to a blocklist
      // For now, we just return success (client should delete tokens)
      return reply.send(createApiSuccess({ message: "Logged out successfully" }));
    }
  );

  // GET /auth/me
  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      return reply.send(createApiSuccess(request.authUser));
    }
  );
}