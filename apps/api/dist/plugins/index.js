"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlugins = registerPlugins;
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const config_js_1 = require("../config.js");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
async function registerPlugins(app) {
    await app.register(helmet_1.default, { contentSecurityPolicy: false });
    await app.register(cors_1.default, {
        origin: config_js_1.config.CORS_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    await app.register(rate_limit_1.default, {
        max: config_js_1.config.RATE_LIMIT_MAX,
        timeWindow: config_js_1.config.RATE_LIMIT_WINDOW,
        keyGenerator: (req) => req.ip,
    });
    await app.register(jwt_1.default, {
        secret: config_js_1.config.JWT_ACCESS_SECRET,
        sign: { expiresIn: config_js_1.config.JWT_ACCESS_EXPIRES_IN },
        verify: { algorithms: ["HS256"] },
    });
    await app.register(jwt_1.default, {
        secret: config_js_1.config.JWT_REFRESH_SECRET,
        sign: { expiresIn: config_js_1.config.JWT_REFRESH_EXPIRES_IN },
        verify: { algorithms: ["HS256"] },
        namespace: "refresh",
    });
    // Auth decorators
    app.decorate("authenticate", async function (request, reply) {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            return reply.code(401).send({
                success: false,
                error: { code: "UNAUTHORIZED", message: "Authentication required" },
            });
        }
    });
    app.decorate("requireAdmin", async function (request, reply) {
        await this.authenticate(request, reply);
        if (!request.authUser || request.authUser.role !== "admin") {
            return reply.code(403).send({
                success: false,
                error: { code: "FORBIDDEN", message: "Admin access required" },
            });
        }
    });
    app.decorate("requireApproved", async function (request, reply) {
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
    app.decorate("getCurrentUser", async function (request) {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer "))
            return null;
        try {
            const token = authHeader.substring(7);
            const decoded = app.jwt.verify(token);
            const [user] = await index_js_1.db
                .select()
                .from(schema_js_1.users)
                .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, decoded.sub))
                .limit(1);
            if (!user)
                return null;
            const { membershipApplications } = await import("../db/schema.js");
            const [application] = await index_js_1.db
                .select({ status: membershipApplications.status })
                .from(membershipApplications)
                .where((0, drizzle_orm_1.eq)(membershipApplications.userId, user.id))
                .limit(1);
            return {
                ...user,
                membershipStatus: application?.status || "pending",
            };
        }
        catch {
            return null;
        }
    });
    app.addHook("preHandler", async (request, reply) => {
        const user = await app.getCurrentUser(request);
        if (user) {
            request.authUser = user;
        }
    });
}
