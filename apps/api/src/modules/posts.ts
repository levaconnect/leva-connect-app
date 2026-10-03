import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { posts, postLikes, comments, profiles, users, connections, membershipApplications } from "../db/schema.js";
import { eq, and, desc, or, inArray, count, sql } from "drizzle-orm";
import {
  CreatePostSchema,
  UpdatePostSchema,
  PostWithAuthorSchema,
  CreateCommentSchema,
  CommentWithAuthorSchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

export async function registerPostRoutes(app: FastifyInstance) {
  // GET /posts (feed)
  app.get(
    "/posts",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(query.page || "1", 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(query.limit || "20", 10)));
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
      connectedUserIds.add(currentUserId);

      const postsWithAuthors = await db
        .select({
          post: posts,
          authorProfile: profiles,
          authorUser: users,
        })
        .from(posts)
        .innerJoin(profiles, eq(posts.authorId, profiles.userId))
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(
          and(
            eq(membershipApplications.status, "approved"),
            or(
              eq(profiles.visibility, "community"),
              and(eq(profiles.visibility, "connections"), inArray(posts.authorId, Array.from(connectedUserIds))),
              eq(posts.authorId, currentUserId)
            )
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limitNum)
        .offset(offset);

      const postIds = postsWithAuthors.map((p) => p.post.id);
      let likeCounts: Record<string, number> = {};
      let commentCounts: Record<string, number> = {};
      let userLikedPosts: Set<string> = new Set();

      if (postIds.length > 0) {
        const likes = await db
          .select({ postId: postLikes.postId, count: count() })
          .from(postLikes)
          .where(inArray(postLikes.postId, postIds))
          .groupBy(postLikes.postId);

        const comments_ = await db
          .select({ postId: comments.postId, count: count() })
          .from(comments)
          .where(inArray(comments.postId, postIds))
          .groupBy(comments.postId);

        const userLikes = await db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(and(inArray(postLikes.postId, postIds), eq(postLikes.userId, currentUserId)));

        likeCounts = Object.fromEntries(likes.map((l) => [l.postId, Number(l.count)]));
        commentCounts = Object.fromEntries(comments_.map((c) => [c.postId, Number(c.count)]));
        userLikedPosts = new Set(userLikes.map((l) => l.postId));
      }

      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(posts)
        .innerJoin(profiles, eq(posts.authorId, profiles.userId))
        .innerJoin(users, eq(posts.authorId, users.id))
        .innerJoin(membershipApplications, eq(users.id, membershipApplications.userId))
        .where(
          and(
            eq(membershipApplications.status, "approved"),
            or(
              eq(profiles.visibility, "community"),
              and(eq(profiles.visibility, "connections"), inArray(posts.authorId, Array.from(connectedUserIds))),
              eq(posts.authorId, currentUserId)
            )
          )
        );

      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limitNum);

      const items = postsWithAuthors.map((p) => ({
        ...p.post,
        author: {
          ...p.authorProfile,
          connectionStatus: "connected" as const,
          connectionCount: 0,
          isOwnProfile: p.post.authorId === currentUserId,
        },
        likeCount: likeCounts[p.post.id] || 0,
        commentCount: commentCounts[p.post.id] || 0,
        isLiked: userLikedPosts.has(p.post.id),
      }));

      return reply.send(
        createApiSuccess({ items, page: pageNum, limit: limitNum, total, totalPages })
      );
    }
  );

  // POST /posts
  app.post(
    "/posts",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { content } = request.body as z.infer<typeof CreatePostSchema>;

      const [post] = await db
        .insert(posts)
        .values({ authorId: request.authUser!.id, content })
        .returning();

      const [authorProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, request.authUser!.id))
        .limit(1);

      return reply.code(201).send(
        createApiSuccess({
          ...post,
          author: {
            ...authorProfile!,
            connectionStatus: "connected" as const,
            connectionCount: 0,
            isOwnProfile: true,
          },
          likeCount: 0,
          commentCount: 0,
          isLiked: false,
        })
      );
    }
  );

  // PATCH /posts/:id
  app.patch(
    "/posts/:id",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const { content } = request.body as z.infer<typeof UpdatePostSchema>;

      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!post) {
        return reply.code(404).send(createApiError("POST_NOT_FOUND", "Post not found"));
      }

      if (post.authorId !== request.authUser!.id) {
        return reply.code(403).send(createApiError("FORBIDDEN", "Cannot edit other users' posts"));
      }

      const [updated] = await db
        .update(posts)
        .set({ content: content!, updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();

      return reply.send(createApiSuccess(updated));
    }
  );

  // DELETE /posts/:id
  app.delete(
    "/posts/:id",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });

      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!post) {
        return reply.code(404).send(createApiError("POST_NOT_FOUND", "Post not found"));
      }

      if (post.authorId !== request.authUser!.id && request.authUser!.role !== "admin") {
        return reply.code(403).send(createApiError("FORBIDDEN", "Cannot delete other users' posts"));
      }

      await db.delete(posts).where(eq(posts.id, id));

      return reply.send(createApiSuccess({ message: "Post deleted" }));
    }
  );

  // POST /posts/:id/like
  app.post(
    "/posts/:id/like",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!post) {
        return reply.code(404).send(createApiError("POST_NOT_FOUND", "Post not found"));
      }

      const [existing] = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, id), eq(postLikes.userId, currentUserId)))
        .limit(1);

      if (existing) {
        return reply.code(400).send(createApiError("ALREADY_LIKED", "Post already liked"));
      }

      await db.insert(postLikes).values({ postId: id, userId: currentUserId });

      return reply.send(createApiSuccess({ liked: true }));
    }
  );

  // DELETE /posts/:id/like
  app.delete(
    "/posts/:id/like",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [existing] = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, id), eq(postLikes.userId, currentUserId)))
        .limit(1);

      if (!existing) {
        return reply.code(404).send(createApiError("NOT_LIKED", "Post not liked"));
      }

      await db.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, currentUserId)));

      return reply.send(createApiSuccess({ liked: false }));
    }
  );

  // GET /posts/:id/comments
  app.get(
    "/posts/:id/comments",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const query = request.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(query.page || "1", 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(query.limit || "50", 10)));
      const offset = (pageNum - 1) * limitNum;

      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!post) {
        return reply.code(404).send(createApiError("POST_NOT_FOUND", "Post not found"));
      }

      const commentsWithAuthors = await db
        .select({
          comment: comments,
          authorProfile: profiles,
        })
        .from(comments)
        .innerJoin(profiles, eq(comments.authorId, profiles.userId))
        .where(eq(comments.postId, id))
        .orderBy(comments.createdAt)
        .limit(limitNum)
        .offset(offset);

      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(comments)
        .where(eq(comments.postId, id));

      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limitNum);

      const items = commentsWithAuthors.map((c) => ({
        ...c.comment,
        author: {
          ...c.authorProfile,
          connectionStatus: "connected" as const,
          connectionCount: 0,
          isOwnProfile: c.comment.authorId === request.authUser!.id,
        },
      }));

      return reply.send(
        createApiSuccess({ items, page: pageNum, limit: limitNum, total, totalPages })
      );
    }
  );

  // POST /posts/:id/comments
  app.post(
    "/posts/:id/comments",
    { preHandler: [app.requireApproved] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const { content } = request.body as z.infer<typeof CreateCommentSchema>;
      const currentUserId = request.authUser!.id;

      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!post) {
        return reply.code(404).send(createApiError("POST_NOT_FOUND", "Post not found"));
      }

      const [comment] = await db
        .insert(comments)
        .values({ postId: id, authorId: currentUserId, content })
        .returning();

      const [authorProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, currentUserId))
        .limit(1);

      return reply.code(201).send(
        createApiSuccess({
          ...comment,
          author: {
            ...authorProfile!,
            connectionStatus: "connected" as const,
            connectionCount: 0,
            isOwnProfile: true,
          },
        })
      );
    }
  );
}