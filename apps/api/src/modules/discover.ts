import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { profiles, users, membershipApplications, connections, connectionRequests } from "../db/schema.js";
import { eq, and, or, ilike, desc, inArray, notInArray, count } from "drizzle-orm";
import {
  DiscoverFiltersSchema,
  DiscoverResultSchema,
  SendConnectionRequestSchema,
  ConnectionRequestWithProfilesSchema,
  ConnectionWithProfileSchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

function parseIntQuery(value: string | string[] | undefined, defaultValue: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(Array.isArray(value) ? value[0] : value, 10);
  return Math.min(max, Math.max(1, isNaN(parsed) ? defaultValue : parsed));
}

export async function registerDiscoverRoutes(app: FastifyInstance) {
  // GET /discover
  app.get(
    "/discover",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const query = request.query as z.infer<typeof DiscoverFiltersSchema>;
      const pageNum = parseIntQuery(query.page as unknown as string | string[] | undefined, 1, 100);
      const limitNum = parseIntQuery(query.limit as unknown as string | string[] | undefined, 20, 50);
      const offset = (pageNum - 1) * limitNum;
      const currentUserId = request.authUser!.id;

      const userConnections = await db
        .select({ userOneId: connections.userOneId, userTwoId: connections.userTwoId })
        .from(connections)
        .where(or(eq(connections.userOneId, currentUserId), eq(connections.userTwoId, currentUserId)));

      const connectedUserIds = new Set<string>();
      for (const conn of userConnections) {
        connectedUserIds.add(conn.userOneId === currentUserId ? conn.userTwoId : conn.userOneId);
      }

      const pendingRequests = await db
        .select({ senderId: connectionRequests.senderId, receiverId: connectionRequests.receiverId })
        .from(connectionRequests)
        .where(
          and(
            eq(connectionRequests.status, "pending"),
            or(
              eq(connectionRequests.senderId, currentUserId),
              eq(connectionRequests.receiverId, currentUserId)
            )
          )
        );

      const pendingUserIds = new Set<string>();
      for (const req of pendingRequests) {
        pendingUserIds.add(req.senderId);
        pendingUserIds.add(req.receiverId);
      }

      const excludedIds = new Set([currentUserId, ...connectedUserIds, ...pendingUserIds]);

      let whereConditions = [
        eq(membershipApplications.status, "approved"),
        eq(profiles.onboardingCompleted, true),
        eq(profiles.visibility, "community"),
        notInArray(profiles.userId, Array.from(excludedIds)),
      ];

      if (query.search) {
        whereConditions.push(
          or(
            ilike(profiles.fullName, `%${query.search}%`),
            ilike(profiles.bio, `%${query.search}%`),
            ilike(profiles.city, `%${query.search}%`),
            ilike(profiles.profession, `%${query.search}%`)
          )!
        );
      }

      if (query.city) {
        whereConditions.push(ilike(profiles.city, `%${query.city}%`));
      }

      const results = await db
        .select({
          profile: profiles,
          user: users,
        })
        .from(profiles)
        .innerJoin(users, eq(profiles.userId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(and(...whereConditions))
        .orderBy(desc(profiles.createdAt))
        .limit(limitNum)
        .offset(offset);

      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(profiles)
        .innerJoin(users, eq(profiles.userId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(and(...whereConditions));

      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limitNum);

      const items = results.map((r) => ({
        ...r.profile,
        connectionStatus: "none" as const,
        connectionCount: 0,
        isOwnProfile: false,
      }));

      return reply.send(
        createApiSuccess({ items, page: pageNum, limit: limitNum, total, totalPages })
      );
    }
  );

  // GET /connections
  app.get(
    "/connections",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const currentUserId = request.authUser!.id;

      const userConnections = await db
        .select({
          connection: connections,
          otherProfile: profiles,
          otherUser: users,
        })
        .from(connections)
        .innerJoin(
          profiles,
          or(
            and(eq(connections.userOneId, currentUserId), eq(profiles.userId, connections.userTwoId)),
            and(eq(connections.userTwoId, currentUserId), eq(profiles.userId, connections.userOneId))
          )
        )
        .innerJoin(users, eq(profiles.userId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(eq(membershipApplications.status, "approved"))
        .orderBy(desc(connections.createdAt));

      const items = userConnections.map((c) => ({
        ...c.connection,
        otherUser: {
          ...c.otherProfile,
          connectionStatus: "connected" as const,
          connectionCount: 0,
          isOwnProfile: false,
        },
      }));

      return reply.send(createApiSuccess({ items }));
    }
  );

  // POST /connections/requests
  app.post(
    "/connections/requests",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { receiverId } = request.body as z.infer<typeof SendConnectionRequestSchema>;
      const senderId = request.authUser!.id;

      if (receiverId === senderId) {
        return reply.code(400).send(createApiError("SELF_CONNECTION", "Cannot connect with yourself"));
      }

      const [receiver] = await db
        .select({ user: users, application: membershipApplications })
        .from(users)
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(eq(users.id, receiverId))
        .limit(1);

      if (!receiver || receiver.application.status !== "approved") {
        return reply.code(404).send(createApiError("USER_NOT_FOUND", "User not found"));
      }

      const [existingConn] = await db
        .select()
        .from(connections)
        .where(
          or(
            and(eq(connections.userOneId, senderId), eq(connections.userTwoId, receiverId)),
            and(eq(connections.userOneId, receiverId), eq(connections.userTwoId, senderId))
          )
        )
        .limit(1);

      if (existingConn) {
        return reply.code(400).send(createApiError("ALREADY_CONNECTED", "Already connected"));
      }

      const [existingReq] = await db
        .select()
        .from(connectionRequests)
        .where(
          or(
            and(eq(connectionRequests.senderId, senderId), eq(connectionRequests.receiverId, receiverId)),
            and(eq(connectionRequests.senderId, receiverId), eq(connectionRequests.receiverId, senderId))
          )
        )
        .limit(1);

      if (existingReq) {
        if (existingReq.status === "pending") {
          return reply.code(400).send(createApiError("REQUEST_EXISTS", "Connection request already pending"));
        }
        if (existingReq.status === "accepted") {
          return reply.code(400).send(createApiError("ALREADY_CONNECTED", "Already connected"));
        }
      }

      const [request_] = await db
        .insert(connectionRequests)
        .values({ senderId, receiverId, status: "pending" })
        .returning();

      return reply.code(201).send(createApiSuccess(request_));
    }
  );

  // GET /connections/requests
  app.get(
    "/connections/requests",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const currentUserId = request.authUser!.id;

      const incoming = await db
        .select({
          request: connectionRequests,
          senderProfile: profiles,
          senderUser: users,
        })
        .from(connectionRequests)
        .innerJoin(profiles, eq(connectionRequests.senderId, profiles.userId))
        .innerJoin(users, eq(connectionRequests.senderId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(
          and(
            eq(connectionRequests.receiverId, currentUserId),
            eq(connectionRequests.status, "pending"),
            eq(membershipApplications.status, "approved")
          )
        )
        .orderBy(desc(connectionRequests.createdAt));

      const outgoing = await db
        .select({
          request: connectionRequests,
          receiverProfile: profiles,
          receiverUser: users,
        })
        .from(connectionRequests)
        .innerJoin(profiles, eq(connectionRequests.receiverId, profiles.userId))
        .innerJoin(users, eq(connectionRequests.receiverId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(
          and(
            eq(connectionRequests.senderId, currentUserId),
            eq(connectionRequests.status, "pending"),
            eq(membershipApplications.status, "approved")
          )
        )
        .orderBy(desc(connectionRequests.createdAt));

      return reply.send(
        createApiSuccess({
          incoming: incoming.map((r) => ({
            ...r.request,
            sender: {
              ...r.senderProfile,
              connectionStatus: "pending_received" as const,
              connectionCount: 0,
              isOwnProfile: false,
            },
          })),
          outgoing: outgoing.map((r) => ({
            ...r.request,
            receiver: {
              ...r.receiverProfile,
              connectionStatus: "pending_sent" as const,
              connectionCount: 0,
              isOwnProfile: false,
            },
          })),
        })
      );
    }
  );

  // POST /connections/requests/:id/accept
  app.post(
    "/connections/requests/:id/accept",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [request_] = await db
        .select()
        .from(connectionRequests)
        .where(
          and(
            eq(connectionRequests.id, id),
            eq(connectionRequests.receiverId, currentUserId),
            eq(connectionRequests.status, "pending")
          )
        )
        .limit(1);

      if (!request_) {
        return reply.code(404).send(createApiError("REQUEST_NOT_FOUND", "Connection request not found"));
      }

      await db.transaction(async (tx) => {
        await tx
          .update(connectionRequests)
          .set({ status: "accepted", updatedAt: new Date() })
          .where(eq(connectionRequests.id, id));

        await tx.insert(connections).values({
          userOneId: request_.senderId,
          userTwoId: request_.receiverId,
        });
      });

      return reply.send(createApiSuccess({ message: "Connection accepted" }));
    }
  );

  // POST /connections/requests/:id/reject
  app.post(
    "/connections/requests/:id/reject",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [request_] = await db
        .select()
        .from(connectionRequests)
        .where(
          and(
            eq(connectionRequests.id, id),
            eq(connectionRequests.receiverId, currentUserId),
            eq(connectionRequests.status, "pending")
          )
        )
        .limit(1);

      if (!request_) {
        return reply.code(404).send(createApiError("REQUEST_NOT_FOUND", "Connection request not found"));
      }

      await db
        .update(connectionRequests)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(connectionRequests.id, id));

      return reply.send(createApiSuccess({ message: "Connection request rejected" }));
    }
  );

  // DELETE /connections/requests/:id
  app.delete(
    "/connections/requests/:id",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [request_] = await db
        .select()
        .from(connectionRequests)
        .where(
          and(
            eq(connectionRequests.id, id),
            eq(connectionRequests.senderId, currentUserId),
            eq(connectionRequests.status, "pending")
          )
        )
        .limit(1);

      if (!request_) {
        return reply.code(404).send(createApiError("REQUEST_NOT_FOUND", "Connection request not found"));
      }

      await db
        .update(connectionRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(connectionRequests.id, id));

      return reply.send(createApiSuccess({ message: "Connection request cancelled" }));
    }
  );

  // DELETE /connections/:id
  app.delete(
    "/connections/:id",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [connection] = await db
        .select()
        .from(connections)
        .where(
          or(
            and(eq(connections.userOneId, currentUserId), eq(connections.userTwoId, id)),
            and(eq(connections.userOneId, id), eq(connections.userTwoId, currentUserId))
          )
        )
        .limit(1);

      if (!connection) {
        return reply.code(404).send(createApiError("CONNECTION_NOT_FOUND", "Connection not found"));
      }

      await db.delete(connections).where(eq(connections.id, connection.id));

      return reply.send(createApiSuccess({ message: "Connection removed" }));
    }
  );
}