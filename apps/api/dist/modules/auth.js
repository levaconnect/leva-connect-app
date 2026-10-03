"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const zod_1 = require("zod");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const argon2_1 = require("argon2");
const config_js_1 = require("../config.js");
const shared_1 = require("@levaconnect/shared");
async function registerAuthRoutes(app) {
    // POST /auth/register
    app.post("/auth/register", {
        config: { rateLimit: { max: config_js_1.config.AUTH_RATE_LIMIT_MAX, timeWindow: config_js_1.config.AUTH_RATE_LIMIT_WINDOW } },
        schema: {
            body: shared_1.RegisterSchema,
            response: {
                201: shared_1.AuthTokensSchema,
                400: zod_1.z.object({ success: zod_1.z.literal(false), error: zod_1.z.object({ code: zod_1.z.string(), message: zod_1.z.string() }) }),
                409: zod_1.z.object({ success: zod_1.z.literal(false), error: zod_1.z.object({ code: zod_1.z.string(), message: zod_1.z.string() }) }),
            },
        },
    }, async (request, reply) => {
        const { email, password, fullName } = request.body;
        const [existing] = await index_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.email, email.toLowerCase()))
            .limit(1);
        if (existing) {
            return reply.code(409).send((0, shared_1.createApiError)("EMAIL_EXISTS", "An account with this email already exists"));
        }
        const passwordHash = await (0, argon2_1.hash)(password, { type: 2 });
        const [user] = await index_js_1.db
            .insert(schema_js_1.users)
            .values({
            email: email.toLowerCase(),
            passwordHash,
            role: "user",
        })
            .returning();
        await index_js_1.db.insert(schema_js_1.profiles).values({
            userId: user.id,
            fullName,
            interests: [],
        });
        await index_js_1.db.insert(schema_js_1.membershipApplications).values({
            userId: user.id,
            status: "pending",
        });
        const accessToken = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, membershipStatus: "pending" });
        const refreshToken = app.refresh.jwt.sign({ sub: user.id, email: user.email, role: user.role });
        return reply.code(201).send((0, shared_1.createApiSuccess)({ accessToken, refreshToken, expiresIn: 900 }));
    });
    // POST /auth/login
    app.post("/auth/login", {
        config: { rateLimit: { max: config_js_1.config.AUTH_RATE_LIMIT_MAX, timeWindow: config_js_1.config.AUTH_RATE_LIMIT_WINDOW } },
        schema: {
            body: shared_1.LoginSchema,
            response: {
                200: shared_1.AuthTokensSchema,
                401: zod_1.z.object({ success: zod_1.z.literal(false), error: zod_1.z.object({ code: zod_1.z.string(), message: zod_1.z.string() }) }),
            },
        },
    }, async (request, reply) => {
        const { email, password } = request.body;
        const [user] = await index_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.email, email.toLowerCase()))
            .limit(1);
        if (!user) {
            return reply.code(401).send((0, shared_1.createApiError)("INVALID_CREDENTIALS", "Invalid email or password"));
        }
        const valid = await (0, argon2_1.verify)(user.passwordHash, password);
        if (!valid) {
            return reply.code(401).send((0, shared_1.createApiError)("INVALID_CREDENTIALS", "Invalid email or password"));
        }
        const [application] = await index_js_1.db
            .select({ status: schema_js_1.membershipApplications.status })
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, user.id))
            .limit(1);
        const membershipStatus = application?.status || "pending";
        const accessToken = app.jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            membershipStatus,
        });
        const refreshToken = app.refresh.jwt.sign({ sub: user.id, email: user.email, role: user.role });
        return reply.send((0, shared_1.createApiSuccess)({ accessToken, refreshToken, expiresIn: 900 }));
    });
    // POST /auth/refresh
    app.post("/auth/refresh", {
        schema: {
            body: zod_1.z.object({ refreshToken: zod_1.z.string() }),
            response: {
                200: shared_1.AuthTokensSchema,
                401: zod_1.z.object({ success: zod_1.z.literal(false), error: zod_1.z.object({ code: zod_1.z.string(), message: zod_1.z.string() }) }),
            },
        },
    }, async (request, reply) => {
        const { refreshToken } = request.body;
        try {
            const decoded = app.refresh.jwt.verify(refreshToken);
            const [user] = await index_js_1.db
                .select()
                .from(schema_js_1.users)
                .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, decoded.sub))
                .limit(1);
            if (!user) {
                return reply.code(401).send((0, shared_1.createApiError)("INVALID_TOKEN", "Invalid refresh token"));
            }
            const [application] = await index_js_1.db
                .select({ status: schema_js_1.membershipApplications.status })
                .from(schema_js_1.membershipApplications)
                .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, user.id))
                .limit(1);
            const membershipStatus = application?.status || "pending";
            const accessToken = app.jwt.sign({
                sub: user.id,
                email: user.email,
                role: user.role,
                membershipStatus,
            });
            const newRefreshToken = app.refresh.jwt.sign({ sub: user.id, email: user.email, role: user.role });
            return reply.send((0, shared_1.createApiSuccess)({ accessToken, refreshToken: newRefreshToken, expiresIn: 900 }));
        }
        catch {
            return reply.code(401).send((0, shared_1.createApiError)("INVALID_TOKEN", "Invalid or expired refresh token"));
        }
    });
    // POST /auth/logout
    app.post("/auth/logout", { preHandler: [app.authenticate] }, async (request, reply) => {
        return reply.send((0, shared_1.createApiSuccess)({ message: "Logged out successfully" }));
    });
    // GET /auth/me
    app.get("/auth/me", { preHandler: [app.authenticate] }, async (request, reply) => {
        return reply.send((0, shared_1.createApiSuccess)(request.authUser));
    });
}
