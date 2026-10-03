"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProfileRoutes = registerProfileRoutes;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@levaconnect/shared");
async function registerProfileRoutes(app) {
    // GET /profiles/me
    app.get("/profiles/me", { preHandler: [app.authenticate] }, async (request, reply) => {
        const [profile] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .limit(1);
        if (!profile) {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_NOT_FOUND", "Profile not found"));
        }
        return reply.send((0, shared_1.createApiSuccess)(profile));
    });
    // PATCH /profiles/me
    app.patch("/profiles/me", { preHandler: [app.authenticate] }, async (request, reply) => {
        const input = request.body;
        const [existing] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .limit(1);
        if (!existing) {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_NOT_FOUND", "Profile not found"));
        }
        const [application] = await index_js_1.db
            .select({ status: schema_js_1.membershipApplications.status })
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, request.authUser.id))
            .limit(1);
        const status = application?.status || "pending";
        if (status === "suspended") {
            return reply.code(403).send((0, shared_1.createApiError)("ACCOUNT_SUSPENDED", "Account is suspended"));
        }
        const [updated] = await index_js_1.db
            .update(schema_js_1.profiles)
            .set({
            ...input,
            dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString().split('T')[0] : undefined,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .returning();
        return reply.send((0, shared_1.createApiSuccess)(updated));
    });
    // POST /profiles/me/onboarding
    app.post("/profiles/me/onboarding", { preHandler: [app.authenticate] }, async (request, reply) => {
        const input = request.body;
        const [existing] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .limit(1);
        if (!existing) {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_NOT_FOUND", "Profile not found"));
        }
        if (existing.onboardingCompleted) {
            return reply.code(400).send((0, shared_1.createApiError)("ONBOARDING_COMPLETED", "Onboarding already completed"));
        }
        const [updated] = await index_js_1.db
            .update(schema_js_1.profiles)
            .set({
            fullName: input.fullName,
            avatarUrl: input.avatarUrl,
            dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString().split('T')[0] : null,
            city: input.city,
            hometown: input.hometown,
            bio: input.bio,
            profession: input.profession,
            education: input.education,
            interests: input.interests || [],
            visibility: input.visibility || "community",
            onboardingCompleted: true,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .returning();
        const [application] = await index_js_1.db
            .select()
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, request.authUser.id))
            .limit(1);
        if (!application) {
            await index_js_1.db.insert(schema_js_1.membershipApplications).values({
                userId: request.authUser.id,
                status: "pending",
            });
        }
        else if (application.status === "rejected") {
            await index_js_1.db
                .update(schema_js_1.membershipApplications)
                .set({ status: "pending", reviewedAt: null, reviewedBy: null, rejectionReason: null, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, request.authUser.id));
        }
        return reply.send((0, shared_1.createApiSuccess)(updated));
    });
    // GET /profiles/:id
    app.get("/profiles/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [targetProfile] = await index_js_1.db
            .select({
            profile: schema_js_1.profiles,
            user: schema_js_1.users,
        })
            .from(schema_js_1.profiles)
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, id))
            .limit(1);
        if (!targetProfile) {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_NOT_FOUND", "Profile not found"));
        }
        const { profile, user } = targetProfile;
        const [targetApplication] = await index_js_1.db
            .select({ status: schema_js_1.membershipApplications.status })
            .from(schema_js_1.membershipApplications)
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.userId, id))
            .limit(1);
        if (!targetApplication || targetApplication.status !== "approved") {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_NOT_FOUND", "Profile not found"));
        }
        if (profile.visibility === "private" && profile.userId !== currentUserId) {
            return reply.code(404).send((0, shared_1.createApiError)("PROFILE_PRIVATE", "This profile is private"));
        }
        let connectionStatus = "none";
        if (profile.visibility === "connections" && profile.userId !== currentUserId) {
            const { connections, connectionRequests } = await import("../db/schema.js");
            const [conn] = await index_js_1.db
                .select()
                .from(connections)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(connections.userOneId, currentUserId), (0, drizzle_orm_1.eq)(connections.userTwoId, id)))
                .limit(1);
            const [conn2] = await index_js_1.db
                .select()
                .from(connections)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(connections.userOneId, id), (0, drizzle_orm_1.eq)(connections.userTwoId, currentUserId)))
                .limit(1);
            if (conn || conn2) {
                connectionStatus = "connected";
            }
            else {
                const [sent] = await index_js_1.db
                    .select()
                    .from(connectionRequests)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(connectionRequests.senderId, currentUserId), (0, drizzle_orm_1.eq)(connectionRequests.receiverId, id), (0, drizzle_orm_1.eq)(connectionRequests.status, "pending")))
                    .limit(1);
                const [received] = await index_js_1.db
                    .select()
                    .from(connectionRequests)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(connectionRequests.senderId, id), (0, drizzle_orm_1.eq)(connectionRequests.receiverId, currentUserId), (0, drizzle_orm_1.eq)(connectionRequests.status, "pending")))
                    .limit(1);
                if (sent)
                    connectionStatus = "pending_sent";
                else if (received)
                    connectionStatus = "pending_received";
            }
            if (connectionStatus === "none") {
                return reply.code(404).send((0, shared_1.createApiError)("PROFILE_PRIVATE", "This profile is only visible to connections"));
            }
        }
        const publicProfile = {
            ...profile,
            connectionStatus,
            connectionCount: 0,
            isOwnProfile: profile.userId === currentUserId,
        };
        return reply.send((0, shared_1.createApiSuccess)(publicProfile));
    });
}
