"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessageRoutes = registerMessageRoutes;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@levaconnect/shared");
async function registerMessageRoutes(app) {
    // GET /conversations
    app.get("/conversations", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const currentUserId = request.authUser.id;
        const userConversations = await index_js_1.db
            .select({ conversationId: schema_js_1.conversationMembers.conversationId })
            .from(schema_js_1.conversationMembers)
            .where((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.userId, currentUserId));
        const conversationIds = userConversations.map((c) => c.conversationId);
        if (conversationIds.length === 0) {
            return reply.send((0, shared_1.createApiSuccess)({ items: [] }));
        }
        const items = [];
        for (const convId of conversationIds) {
            const members = await index_js_1.db
                .select({ userId: schema_js_1.conversationMembers.userId, lastReadAt: schema_js_1.conversationMembers.lastReadAt })
                .from(schema_js_1.conversationMembers)
                .where((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.conversationId, convId));
            const otherMemberId = members.find((m) => m.userId !== currentUserId)?.userId;
            if (!otherMemberId)
                continue;
            const [otherProfile] = await index_js_1.db
                .select()
                .from(schema_js_1.profiles)
                .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, otherMemberId))
                .limit(1);
            const [lastMsg] = await index_js_1.db
                .select()
                .from(schema_js_1.messages)
                .where((0, drizzle_orm_1.eq)(schema_js_1.messages.conversationId, convId))
                .orderBy((0, drizzle_orm_1.desc)(schema_js_1.messages.createdAt))
                .limit(1);
            const myMember = members.find((m) => m.userId === currentUserId);
            let unreadCount = 0;
            if (myMember?.lastReadAt && lastMsg) {
                const [{ unread }] = await index_js_1.db
                    .select({ unread: (0, drizzle_orm_1.count)() })
                    .from(schema_js_1.messages)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.messages.conversationId, convId), (0, drizzle_orm_1.sql) `${schema_js_1.messages.createdAt} > ${myMember.lastReadAt}`));
                unreadCount = Number(unread);
            }
            else if (!myMember?.lastReadAt) {
                const [{ total }] = await index_js_1.db
                    .select({ total: (0, drizzle_orm_1.count)() })
                    .from(schema_js_1.messages)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.messages.conversationId, convId));
                unreadCount = Number(total);
            }
            items.push({
                id: convId,
                createdAt: new Date(),
                updatedAt: new Date(),
                members: [
                    { userId: currentUserId, lastReadAt: myMember?.lastReadAt || null },
                    { userId: otherMemberId, lastReadAt: members.find((m) => m.userId === otherMemberId)?.lastReadAt || null },
                ],
                otherUser: otherProfile
                    ? {
                        ...otherProfile,
                        connectionStatus: "connected",
                        connectionCount: 0,
                        isOwnProfile: false,
                    }
                    : null,
                lastMessage: lastMsg || null,
                unreadCount,
            });
        }
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return reply.send((0, shared_1.createApiSuccess)({ items }));
    });
    // POST /conversations
    app.post("/conversations", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { participantId } = request.body;
        const currentUserId = request.authUser.id;
        if (participantId === currentUserId) {
            return reply.code(400).send((0, shared_1.createApiError)("SELF_CONVERSATION", "Cannot create conversation with yourself"));
        }
        const [participant] = await index_js_1.db
            .select({ user: schema_js_1.users, application: schema_js_1.membershipApplications })
            .from(schema_js_1.users)
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.id, participantId))
            .limit(1);
        if (!participant || participant.application.status !== "approved") {
            return reply.code(404).send((0, shared_1.createApiError)("USER_NOT_FOUND", "User not found"));
        }
        const [connection] = await index_js_1.db
            .select()
            .from(schema_js_1.connections)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, currentUserId), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, participantId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.connections.userOneId, participantId), (0, drizzle_orm_1.eq)(schema_js_1.connections.userTwoId, currentUserId))))
            .limit(1);
        if (!connection) {
            return reply.code(403).send((0, shared_1.createApiError)("NOT_CONNECTED", "Can only message connected members"));
        }
        const existingConversations = await index_js_1.db
            .select({ conversationId: schema_js_1.conversationMembers.conversationId })
            .from(schema_js_1.conversationMembers)
            .where((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.userId, currentUserId));
        for (const ec of existingConversations) {
            const [otherMember] = await index_js_1.db
                .select({ userId: schema_js_1.conversationMembers.userId })
                .from(schema_js_1.conversationMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.conversationId, ec.conversationId), (0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.userId, participantId)))
                .limit(1);
            if (otherMember) {
                return reply.code(400).send((0, shared_1.createApiError)("CONVERSATION_EXISTS", "Conversation already exists"));
            }
        }
        const [conversation] = await index_js_1.db.insert(schema_js_1.conversations).values({}).returning();
        await index_js_1.db.insert(schema_js_1.conversationMembers).values([
            { conversationId: conversation.id, userId: currentUserId },
            { conversationId: conversation.id, userId: participantId },
        ]);
        return reply.code(201).send((0, shared_1.createApiSuccess)({ id: conversation.id }));
    });
    // GET /conversations/:id/messages
    app.get("/conversations/:id/messages", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const query = request.query;
        const pageNum = Math.max(1, parseInt(query.page || "1", 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(query.limit || "50", 10)));
        const offset = (pageNum - 1) * limitNum;
        const currentUserId = request.authUser.id;
        const [membership] = await index_js_1.db
            .select()
            .from(schema_js_1.conversationMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.conversationId, id), (0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.userId, currentUserId)))
            .limit(1);
        if (!membership) {
            return reply.code(403).send((0, shared_1.createApiError)("FORBIDDEN", "Not a member of this conversation"));
        }
        const messagesList = await index_js_1.db
            .select({
            message: schema_js_1.messages,
            senderProfile: schema_js_1.profiles,
        })
            .from(schema_js_1.messages)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.messages.senderId, schema_js_1.profiles.userId))
            .where((0, drizzle_orm_1.eq)(schema_js_1.messages.conversationId, id))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.messages.createdAt))
            .limit(limitNum)
            .offset(offset);
        const [{ totalCount }] = await index_js_1.db
            .select({ totalCount: (0, drizzle_orm_1.count)() })
            .from(schema_js_1.messages)
            .where((0, drizzle_orm_1.eq)(schema_js_1.messages.conversationId, id));
        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limitNum);
        await index_js_1.db
            .update(schema_js_1.conversationMembers)
            .set({ lastReadAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.conversationId, id), (0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.userId, currentUserId)));
        const items = messagesList.map((m) => ({
            ...m.message,
            sender: {
                ...m.senderProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: m.message.senderId === currentUserId,
            },
        }));
        return reply.send((0, shared_1.createApiSuccess)({ items, page: pageNum, limit: limitNum, total, totalPages }));
    });
    // POST /conversations/:id/messages
    app.post("/conversations/:id/messages", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const { content } = request.body;
        const currentUserId = request.authUser.id;
        const [membership] = await index_js_1.db
            .select()
            .from(schema_js_1.conversationMembers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.conversationId, id), (0, drizzle_orm_1.eq)(schema_js_1.conversationMembers.userId, currentUserId)))
            .limit(1);
        if (!membership) {
            return reply.code(403).send((0, shared_1.createApiError)("FORBIDDEN", "Not a member of this conversation"));
        }
        const [message] = await index_js_1.db
            .insert(schema_js_1.messages)
            .values({ conversationId: id, senderId: currentUserId, content })
            .returning();
        await index_js_1.db
            .update(schema_js_1.conversations)
            .set({ updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.conversations.id, id));
        const [senderProfile] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, currentUserId))
            .limit(1);
        return reply.code(201).send((0, shared_1.createApiSuccess)({
            ...message,
            sender: {
                ...senderProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: true,
            },
        }));
    });
}
