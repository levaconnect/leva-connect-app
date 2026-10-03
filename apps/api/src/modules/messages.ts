import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { conversations, conversationMembers, messages, users, profiles, connections, membershipApplications } from "../db/schema.js";
import { eq, and, desc, or, inArray, count, sql } from "drizzle-orm";
import {
  CreateConversationSchema,
  CreateMessageSchema,
  ConversationWithDetailsSchema,
  MessageWithSenderSchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

export async function registerMessageRoutes(app: FastifyInstance) {
  // GET /conversations
  app.get(
    "/conversations",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const currentUserId = request.authUser!.id;

      const userConversations = await db
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, currentUserId));

      const conversationIds = userConversations.map((c) => c.conversationId);

      if (conversationIds.length === 0) {
        return reply.send(createApiSuccess({ items: [] }));
      }

      const items = [];
      for (const convId of conversationIds) {
        const members = await db
          .select({ userId: conversationMembers.userId, lastReadAt: conversationMembers.lastReadAt })
          .from(conversationMembers)
          .where(eq(conversationMembers.conversationId, convId));

        const otherMemberId = members.find((m) => m.userId !== currentUserId)?.userId;
        if (!otherMemberId) continue;

        const [otherProfile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, otherMemberId))
          .limit(1);

        const [lastMsg] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, convId))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const myMember = members.find((m) => m.userId === currentUserId);
        let unreadCount = 0;
        if (myMember?.lastReadAt && lastMsg) {
          const [{ unread }] = await db
            .select({ unread: count() })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, convId),
                sql`${messages.createdAt} > ${myMember.lastReadAt}`
              )
            );
          unreadCount = Number(unread);
        } else if (!myMember?.lastReadAt) {
          const [{ total }] = await db
            .select({ total: count() })
            .from(messages)
            .where(eq(messages.conversationId, convId));
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
                connectionStatus: "connected" as const,
                connectionCount: 0,
                isOwnProfile: false,
              }
            : null,
          lastMessage: lastMsg || null,
          unreadCount,
        });
      }

      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return reply.send(createApiSuccess({ items }));
    }
  );

  // POST /conversations
  app.post(
    "/conversations",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { participantId } = request.body as z.infer<typeof CreateConversationSchema>;
      const currentUserId = request.authUser!.id;

      if (participantId === currentUserId) {
        return reply.code(400).send(createApiError("SELF_CONVERSATION", "Cannot create conversation with yourself"));
      }

      const [participant] = await db
        .select({ user: users, application: membershipApplications })
        .from(users)
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(eq(users.id, participantId))
        .limit(1);

      if (!participant || participant.application.status !== "approved") {
        return reply.code(404).send(createApiError("USER_NOT_FOUND", "User not found"));
      }

      const [connection] = await db
        .select()
        .from(connections)
        .where(
          or(
            and(eq(connections.userOneId, currentUserId), eq(connections.userTwoId, participantId)),
            and(eq(connections.userOneId, participantId), eq(connections.userTwoId, currentUserId))
          )
        )
        .limit(1);

      if (!connection) {
        return reply.code(403).send(createApiError("NOT_CONNECTED", "Can only message connected members"));
      }

      const existingConversations = await db
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, currentUserId));

      for (const ec of existingConversations) {
        const [otherMember] = await db
          .select({ userId: conversationMembers.userId })
          .from(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, ec.conversationId),
              eq(conversationMembers.userId, participantId)
            )
          )
          .limit(1);

        if (otherMember) {
          return reply.code(400).send(createApiError("CONVERSATION_EXISTS", "Conversation already exists"));
        }
      }

      const [conversation] = await db.insert(conversations).values({}).returning();

      await db.insert(conversationMembers).values([
        { conversationId: conversation.id, userId: currentUserId },
        { conversationId: conversation.id, userId: participantId },
      ]);

      return reply.code(201).send(createApiSuccess({ id: conversation.id }));
    }
  );

  // GET /conversations/:id/messages
  app.get(
    "/conversations/:id/messages",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const query = request.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(query.page || "1", 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(query.limit || "50", 10)));
      const offset = (pageNum - 1) * limitNum;
      const currentUserId = request.authUser!.id;

      const [membership] = await db
        .select()
        .from(conversationMembers)
        .where(
          and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, currentUserId))
        )
        .limit(1);

      if (!membership) {
        return reply.code(403).send(createApiError("FORBIDDEN", "Not a member of this conversation"));
      }

      const messagesList = await db
        .select({
          message: messages,
          senderProfile: profiles,
        })
        .from(messages)
        .innerJoin(profiles, eq(messages.senderId, profiles.userId))
        .where(eq(messages.conversationId, id))
        .orderBy(desc(messages.createdAt))
        .limit(limitNum)
        .offset(offset);

      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(messages)
        .where(eq(messages.conversationId, id));

      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limitNum);

      await db
        .update(conversationMembers)
        .set({ lastReadAt: new Date() })
        .where(and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, currentUserId)));

      const items = messagesList.map((m) => ({
        ...m.message,
        sender: {
          ...m.senderProfile,
          connectionStatus: "connected" as const,
          connectionCount: 0,
          isOwnProfile: m.message.senderId === currentUserId,
        },
      }));

      return reply.send(
        createApiSuccess({ items, page: pageNum, limit: limitNum, total, totalPages })
      );
    }
  );

  // POST /conversations/:id/messages
  app.post(
    "/conversations/:id/messages",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const { content } = request.body as z.infer<typeof CreateMessageSchema>;
      const currentUserId = request.authUser!.id;

      const [membership] = await db
        .select()
        .from(conversationMembers)
        .where(
          and(eq(conversationMembers.conversationId, id), eq(conversationMembers.userId, currentUserId))
        )
        .limit(1);

      if (!membership) {
        return reply.code(403).send(createApiError("FORBIDDEN", "Not a member of this conversation"));
      }

      const [message] = await db
        .insert(messages)
        .values({ conversationId: id, senderId: currentUserId, content })
        .returning();

      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, id));

      const [senderProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, currentUserId))
        .limit(1);

      return reply.code(201).send(
        createApiSuccess({
          ...message,
          sender: {
            ...senderProfile!,
            connectionStatus: "connected" as const,
            connectionCount: 0,
            isOwnProfile: true,
          },
        })
      );
    }
  );
}