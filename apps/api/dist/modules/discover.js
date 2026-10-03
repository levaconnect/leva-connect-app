"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDiscoverRoutes = registerDiscoverRoutes;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@levaconnect/shared");
function parseIntQuery(value, defaultValue, max) {
    if (!value)
        return defaultValue;
    const parsed = parseInt(Array.isArray(value) ? value[0] : value, 10);
    return Math.min(max, Math.max(1, isNaN(parsed) ? defaultValue : parsed));
}
async function registerDiscoverRoutes(app) {
    // GET /discover
    app.get("/discover", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const query = request.query;
        const pageNum = parseIntQuery(query.page, 1, 100);
        const limitNum = parseIntQuery(query.limit, 20, 50);
        const offset = (pageNum - 1) * limitNum;
        const currentUserId = request.authUser.id;
        const userConnections = await index_js_1.db
            .select({ userOneId: schema_js_1.connections.userOneId, userTwoId: schema_js_1.connections.userTwoId })
            .from(schema_js_1.connections)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, currentUserId)));
        const connectedUserIds = new Set();
        for (const conn of userConnections) {
            connectedUserIds.add(conn.userOneId === currentUserId ? conn.userTwoId : conn.userOneId);
        }
        const pendingRequests = await index_js_1.db
            .select({ senderId: schema_js_1.connectionRequests.senderId, receiverId: schema_js_1.connectionRequests.receiverId })
            .from(schema_js_1.connectionRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.status, "pending"), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, currentUserId))));
        const pendingUserIds = new Set();
        for (const req of pendingRequests) {
            pendingUserIds.add(req.senderId);
            pendingUserIds.add(req.receiverId);
        }
        const excludedIds = new Set([currentUserId, ...connectedUserIds, ...pendingUserIds]);
        let whereConditions = [
            (0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, "approved"),
            (0, drizzle_orm_1.eq)(schema_js_1.profiles.onboardingCompleted, true),
            (0, drizzle_orm_1.eq)(schema_js_1.profiles.visibility, "community"),
            (0, drizzle_orm_1.notInArray)(schema_js_1.profiles.userId, Array.from(excludedIds)),
        ];
        if (query.search) {
            whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_js_1.profiles.fullName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_js_1.profiles.bio, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_js_1.profiles.city, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_js_1.profiles.profession, `%${query.search}%`)));
        }
        if (query.city) {
            whereConditions.push((0, drizzle_orm_1.ilike)(schema_js_1.profiles.city, `%${query.city}%`));
        }
        const results = await index_js_1.db
            .select({
            profile: schema_js_1.profiles,
            user: schema_js_1.users,
        })
            .from(schema_js_1.profiles)
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.and)(...whereConditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.profiles.createdAt))
            .limit(limitNum)
            .offset(offset);
        const [{ totalCount }] = await index_js_1.db
            .select({ totalCount: (0, drizzle_orm_1.count)() })
            .from(schema_js_1.profiles)
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.and)(...whereConditions));
        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limitNum);
        const items = results.map((r) => ({
            ...r.profile,
            connectionStatus: "none",
            connectionCount: 0,
            isOwnProfile: false,
        }));
        return reply.send((0, shared_1.createApiSuccess)({ items, page: pageNum, limit: limitNum, total, totalPages }));
    });
    // GET /connections
    app.get("/connections", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const currentUserId = request.authUser.id;
        const userConnections = await index_js_1.db
            .select({
            connection: schema_js_1.connections,
            otherProfile: schema_js_1.profiles,
            otherUser: schema_js_1.users,
        })
            .from(schema_js_1.connections)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.connections.userTwoId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.connections.userOneId))))
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, "approved"))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.connections.createdAt));
        const items = userConnections.map((c) => ({
            ...c.connection,
            otherUser: {
                ...c.otherProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: false,
            },
        }));
        return reply.send((0, shared_1.createApiSuccess)({ items }));
    });
    // POST /connections/requests
    app.post("/connections/requests", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { receiverId } = request.body;
        const senderId = request.authUser.id;
        if (receiverId === senderId) {
            return reply.code(400).send((0, shared_1.createApiError)("SELF_CONNECTION", "Cannot connect with yourself"));
        }
        const [receiver] = await index_js_1.db
            .select({ user: schema_js_1.users, application: schema_js_1.membershipApplications })
            .from(schema_js_1.users)
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, receiverId))
            .limit(1);
        if (!receiver || receiver.application.status !== "approved") {
            return reply.code(404).send((0, shared_1.createApiError)("USER_NOT_FOUND", "User not found"));
        }
        const [existingConn] = await index_js_1.db
            .select()
            .from(schema_js_1.connections)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, senderId), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, receiverId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, receiverId), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, senderId))))
            .limit(1);
        if (existingConn) {
            return reply.code(400).send((0, shared_1.createApiError)("ALREADY_CONNECTED", "Already connected"));
        }
        const [existingReq] = await index_js_1.db
            .select()
            .from(schema_js_1.connectionRequests)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, senderId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, receiverId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, receiverId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, senderId))))
            .limit(1);
        if (existingReq) {
            if (existingReq.status === "pending") {
                return reply.code(400).send((0, shared_1.createApiError)("REQUEST_EXISTS", "Connection request already pending"));
            }
            if (existingReq.status === "accepted") {
                return reply.code(400).send((0, shared_1.createApiError)("ALREADY_CONNECTED", "Already connected"));
            }
        }
        const [request_] = await index_js_1.db
            .insert(schema_js_1.connectionRequests)
            .values({ senderId, receiverId, status: "pending" })
            .returning();
        return reply.code(201).send((0, shared_1.createApiSuccess)(request_));
    });
    // GET /connections/requests
    app.get("/connections/requests", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const currentUserId = request.authUser.id;
        const incoming = await index_js_1.db
            .select({
            request: schema_js_1.connectionRequests,
            senderProfile: schema_js_1.profiles,
            senderUser: schema_js_1.users,
        })
            .from(schema_js_1.connectionRequests)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, schema_js_1.profiles.userId))
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.status, "pending"), (0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, "approved")))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.connectionRequests.createdAt));
        const outgoing = await index_js_1.db
            .select({
            request: schema_js_1.connectionRequests,
            receiverProfile: schema_js_1.profiles,
            receiverUser: schema_js_1.users,
        })
            .from(schema_js_1.connectionRequests)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, schema_js_1.profiles.userId))
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.status, "pending"), (0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, "approved")))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.connectionRequests.createdAt));
        return reply.send((0, shared_1.createApiSuccess)({
            incoming: incoming.map((r) => ({
                ...r.request,
                sender: {
                    ...r.senderProfile,
                    connectionStatus: "pending_received",
                    connectionCount: 0,
                    isOwnProfile: false,
                },
            })),
            outgoing: outgoing.map((r) => ({
                ...r.request,
                receiver: {
                    ...r.receiverProfile,
                    connectionStatus: "pending_sent",
                    connectionCount: 0,
                    isOwnProfile: false,
                },
            })),
        }));
    });
    // POST /connections/requests/:id/accept
    app.post("/connections/requests/:id/accept", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [request_] = await index_js_1.db
            .select()
            .from(schema_js_1.connectionRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.id, id), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.status, "pending")))
            .limit(1);
        if (!request_) {
            return reply.code(404).send((0, shared_1.createApiError)("REQUEST_NOT_FOUND", "Connection request not found"));
        }
        await index_js_1.db.transaction(async (tx) => {
            await tx
                .update(schema_js_1.connectionRequests)
                .set({ status: "accepted", updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.id, id));
            await tx.insert(schema_js_1.connections).values({
                userOneId: request_.senderId,
                userTwoId: request_.receiverId,
            });
        });
        return reply.send((0, shared_1.createApiSuccess)({ message: "Connection accepted" }));
    });
    // POST /connections/requests/:id/reject
    app.post("/connections/requests/:id/reject", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [request_] = await index_js_1.db
            .select()
            .from(schema_js_1.connectionRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.id, id), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.receiverId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.status, "pending")))
            .limit(1);
        if (!request_) {
            return reply.code(404).send((0, shared_1.createApiError)("REQUEST_NOT_FOUND", "Connection request not found"));
        }
        await index_js_1.db
            .update(schema_js_1.connectionRequests)
            .set({ status: "rejected", updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.id, id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Connection request rejected" }));
    });
    // DELETE /connections/requests/:id
    app.delete("/connections/requests/:id", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [request_] = await index_js_1.db
            .select()
            .from(schema_js_1.connectionRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.id, id), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.senderId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.status, "pending")))
            .limit(1);
        if (!request_) {
            return reply.code(404).send((0, shared_1.createApiError)("REQUEST_NOT_FOUND", "Connection request not found"));
        }
        await index_js_1.db
            .update(schema_js_1.connectionRequests)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.connectionRequests.id, id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Connection request cancelled" }));
    });
    // DELETE /connections/:id
    app.delete("/connections/:id", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [connection] = await index_js_1.db
            .select()
            .from(schema_js_1.connections)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, id)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, id), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, currentUserId))))
            .limit(1);
        if (!connection) {
            return reply.code(404).send((0, shared_1.createApiError)("CONNECTION_NOT_FOUND", "Connection not found"));
        }
        await index_js_1.db.delete(schema_js_1.connections).where((0, drizzle_orm_1.eq)(schema_js_1.connections.id, connection.id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Connection removed" }));
    });
}
