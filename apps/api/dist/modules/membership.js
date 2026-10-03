"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMembershipRoutes = registerMembershipRoutes;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@levaconnect/shared");
async function registerMembershipRoutes(app) {
    app.get("/membership/status", { preHandler: [app.authenticate] }, async (request, reply) => {
        const [application] = await index_js_1.db
            .select()
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, request.authUser.id))
            .limit(1);
        if (!application) {
            return reply.code(404).send((0, shared_1.createApiError)("APPLICATION_NOT_FOUND", "No membership application found"));
        }
        return reply.send((0, shared_1.createApiSuccess)({
            status: application.status,
            reviewedAt: application.reviewedAt,
            rejectionReason: application.rejectionReason,
        }));
    });
    app.post("/membership/apply", { preHandler: [app.authenticate] }, async (request, reply) => {
        const [existing] = await index_js_1.db
            .select()
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, request.authUser.id))
            .limit(1);
        if (existing) {
            if (existing.status === "pending") {
                return reply.code(400).send((0, shared_1.createApiError)("ALREADY_PENDING", "Application already pending"));
            }
            if (existing.status === "approved") {
                return reply.code(400).send((0, shared_1.createApiError)("ALREADY_APPROVED", "Already approved"));
            }
            if (existing.status === "suspended") {
                return reply.code(403).send((0, shared_1.createApiError)("ACCOUNT_SUSPENDED", "Account is suspended"));
            }
            await index_js_1.db
                .update(schema_js_1.membershipApplications)
                .set({ status: "pending", reviewedAt: null, reviewedBy: null, rejectionReason: null, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, request.authUser.id));
        }
        else {
            await index_js_1.db.insert(schema_js_1.membershipApplications).values({
                userId: request.authUser.id,
                status: "pending",
            });
        }
        return reply.send((0, shared_1.createApiSuccess)({ message: "Application submitted" }));
    });
    app.get("/admin/applications", { preHandler: [app.requireAdmin] }, async (request, reply) => {
        const query = request.query;
        const page = Math.max(1, parseInt(query.page || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(query.limit || "20", 10)));
        const status = query.status;
        const offset = (page - 1) * limit;
        let whereClause;
        if (status) {
            whereClause = (0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, status);
        }
        const [applications, [{ count: totalCount }]] = await Promise.all([
            index_js_1.db
                .select({
                application: schema_js_1.membershipApplications,
                user: schema_js_1.users,
                profile: schema_js_1.profiles,
            })
                .from(schema_js_1.membershipApplications)
                .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, schema_js_1.users.id))
                .leftJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.users.id))
                .where(whereClause)
                .orderBy((0, drizzle_orm_1.desc)(schema_js_1.membershipApplications.createdAt))
                .limit(limit)
                .offset(offset),
            index_js_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_js_1.membershipApplications)
                .where(whereClause),
        ]);
        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limit);
        return reply.send((0, shared_1.createApiSuccess)({
            items: applications.map((a) => ({
                ...a.application,
                user: a.user,
                profile: a.profile,
            })),
            page,
            limit,
            total,
            totalPages,
        }));
    });
    app.post("/admin/applications/:id/approve", { preHandler: [app.requireAdmin] }, async (request, reply) => {
        const { id } = request.params;
        const [application] = await index_js_1.db
            .select()
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.id, id))
            .limit(1);
        if (!application) {
            return reply.code(404).send((0, shared_1.createApiError)("APPLICATION_NOT_FOUND", "Application not found"));
        }
        if (application.status !== "pending") {
            return reply.code(400).send((0, shared_1.createApiError)("INVALID_STATUS", "Application is not pending"));
        }
        await index_js_1.db
            .update(schema_js_1.membershipApplications)
            .set({
            status: "approved",
            reviewedBy: request.authUser.id,
            reviewedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.id, id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Application approved" }));
    });
    app.post("/admin/applications/:id/reject", { preHandler: [app.requireAdmin] }, async (request, reply) => {
        const { id } = request.params;
        const { reason } = request.body;
        const [application] = await index_js_1.db
            .select()
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.id, id))
            .limit(1);
        if (!application) {
            return reply.code(404).send((0, shared_1.createApiError)("APPLICATION_NOT_FOUND", "Application not found"));
        }
        if (application.status !== "pending") {
            return reply.code(400).send((0, shared_1.createApiError)("INVALID_STATUS", "Application is not pending"));
        }
        await index_js_1.db
            .update(schema_js_1.membershipApplications)
            .set({
            status: "rejected",
            reviewedBy: request.authUser.id,
            reviewedAt: new Date(),
            rejectionReason: reason,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.id, id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Application rejected" }));
    });
}
