"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsRoutes = registerSettingsRoutes;
const zod_1 = require("zod");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const argon2_1 = require("argon2");
const shared_1 = require("@levaconnect/shared");
async function registerSettingsRoutes(app) {
    // PATCH /settings/privacy
    app.patch("/settings/privacy", { preHandler: [app.authenticate] }, async (request, reply) => {
        const { visibility } = request.body;
        const [profile] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .limit(1);
        if (!profile) {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_NOT_FOUND", "Profile not found"));
        }
        const [updated] = await index_js_1.db
            .update(schema_js_1.profiles)
            .set({ visibility, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .returning();
        return reply.send((0, shared_1.createApiSuccess)(updated));
    });
    // POST /settings/password
    app.post("/settings/password", { preHandler: [app.authenticate] }, async (request, reply) => {
        const schema = zod_1.z.object({
            currentPassword: zod_1.z.string().min(1),
            newPassword: zod_1.z.string().min(8).max(128),
        });
        const { currentPassword, newPassword } = request.body;
        const [user] = await index_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, request.authUser.id))
            .limit(1);
        if (!user) {
            return reply.code(404).send((0, shared_1.createApiError)("USER_NOT_FOUND", "User not found"));
        }
        const valid = await (0, argon2_1.verify)(user.passwordHash, currentPassword);
        if (!valid) {
            return reply.code(401).send((0, shared_1.createApiError)("INVALID_PASSWORD", "Current password is incorrect"));
        }
        const newPasswordHash = await (0, argon2_1.hash)(newPassword, { type: 2 });
        await index_js_1.db
            .update(schema_js_1.users)
            .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, request.authUser.id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Password updated successfully" }));
    });
    // DELETE /account
    app.delete("/account", { preHandler: [app.authenticate] }, async (request, reply) => {
        const schema = zod_1.z.object({
            password: zod_1.z.string().min(1),
            confirm: zod_1.z.literal(true),
        });
        const { password, confirm } = request.body;
        if (!confirm) {
            return reply.code(400).send((0, shared_1.createApiError)("CONFIRMATION_REQUIRED", "Must confirm account deletion"));
        }
        const [user] = await index_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, request.authUser.id))
            .limit(1);
        if (!user) {
            return reply.code(404).send((0, shared_1.createApiError)("USER_NOT_FOUND", "User not found"));
        }
        const valid = await (0, argon2_1.verify)(user.passwordHash, password);
        if (!valid) {
            return reply.code(401).send((0, shared_1.createApiError)("INVALID_PASSWORD", "Password is incorrect"));
        }
        await index_js_1.db.delete(schema_js_1.users).where((0, drizzle_orm_1.eq)(schema_js_1.users.id, request.authUser.id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Account deleted successfully" }));
    });
}
