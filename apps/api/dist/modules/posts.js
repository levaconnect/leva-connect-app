"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPostRoutes = registerPostRoutes;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@levaconnect/shared");
async function registerPostRoutes(app) {
    // GET /posts (feed)
    app.get("/posts", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const query = request.query;
        const pageNum = Math.max(1, parseInt(query.page || "1", 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(query.limit || "20", 10)));
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
        connectedUserIds.add(currentUserId);
        const postsWithAuthors = await index_js_1.db
            .select({
            post: schema_js_1.posts,
            authorProfile: schema_js_1.profiles,
            authorUser: schema_js_1.users,
        })
            .from(schema_js_1.posts)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.posts.authorId, schema_js_1.profiles.userId))
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.posts.authorId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, "approved"), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_js_1.profiles.visibility, "community"), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.profiles.visibility, "connections"), (0, drizzle_orm_1.inArray)(schema_js_1.posts.authorId, Array.from(connectedUserIds))), (0, drizzle_orm_1.eq)(schema_js_1.posts.authorId, currentUserId))))
            .orderBy((0, drizzle_orm_1.desc)(schema_js_1.posts.createdAt))
            .limit(limitNum)
            .offset(offset);
        const postIds = postsWithAuthors.map((p) => p.post.id);
        let likeCounts = {};
        let commentCounts = {};
        let userLikedPosts = new Set();
        if (postIds.length > 0) {
            const likes = await index_js_1.db
                .select({ postId: schema_js_1.postLikes.postId, count: (0, drizzle_orm_1.count)() })
                .from(schema_js_1.postLikes)
                .where((0, drizzle_orm_1.inArray)(schema_js_1.postLikes.postId, postIds))
                .groupBy(schema_js_1.postLikes.postId);
            const comments_ = await index_js_1.db
                .select({ postId: schema_js_1.comments.postId, count: (0, drizzle_orm_1.count)() })
                .from(schema_js_1.comments)
                .where((0, drizzle_orm_1.inArray)(schema_js_1.comments.postId, postIds))
                .groupBy(schema_js_1.comments.postId);
            const userLikes = await index_js_1.db
                .select({ postId: schema_js_1.postLikes.postId })
                .from(schema_js_1.postLikes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_js_1.postLikes.postId, postIds), (0, drizzle_orm_1.eq)(schema_js_1.postLikes.userId, currentUserId)));
            likeCounts = Object.fromEntries(likes.map((l) => [l.postId, Number(l.count)]));
            commentCounts = Object.fromEntries(comments_.map((c) => [c.postId, Number(c.count)]));
            userLikedPosts = new Set(userLikes.map((l) => l.postId));
        }
        const [{ totalCount }] = await index_js_1.db
            .select({ totalCount: (0, drizzle_orm_1.count)() })
            .from(schema_js_1.posts)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.posts.authorId, schema_js_1.profiles.userId))
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.posts.authorId, schema_js_1.users.id))
            .innerJoin(schema_js_1.membershipApplications, (0, drizzle_orm_1.eq)(schema_js_1.users.id, schema_js_1.membershipApplications.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.membershipApplications.status, "approved"), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_js_1.profiles.visibility, "community"), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.profiles.visibility, "connections"), (0, drizzle_orm_1.inArray)(schema_js_1.posts.authorId, Array.from(connectedUserIds))), (0, drizzle_orm_1.eq)(schema_js_1.posts.authorId, currentUserId))));
        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limitNum);
        const items = postsWithAuthors.map((p) => ({
            ...p.post,
            author: {
                ...p.authorProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: p.post.authorId === currentUserId,
            },
            likeCount: likeCounts[p.post.id] || 0,
            commentCount: commentCounts[p.post.id] || 0,
            isLiked: userLikedPosts.has(p.post.id),
        }));
        return reply.send((0, shared_1.createApiSuccess)({ items, page: pageNum, limit: limitNum, total, totalPages }));
    });
    // POST /posts
    app.post("/posts", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { content } = request.body;
        const [post] = await index_js_1.db
            .insert(schema_js_1.posts)
            .values({ authorId: request.authUser.id, content })
            .returning();
        const [authorProfile] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, request.authUser.id))
            .limit(1);
        return reply.code(201).send((0, shared_1.createApiSuccess)({
            ...post,
            author: {
                ...authorProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: true,
            },
            likeCount: 0,
            commentCount: 0,
            isLiked: false,
        }));
    });
    // PATCH /posts/:id
    app.patch("/posts/:id", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const { content } = request.body;
        const [post] = await index_js_1.db
            .select()
            .from(schema_js_1.posts)
            .where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id))
            .limit(1);
        if (!post) {
            return reply.code(404).send((0, shared_1.createApiError)("POST_NOT_FOUND", "Post not found"));
        }
        if (post.authorId !== request.authUser.id) {
            return reply.code(403).send((0, shared_1.createApiError)("FORBIDDEN", "Cannot edit other users' posts"));
        }
        const [updated] = await index_js_1.db
            .update(schema_js_1.posts)
            .set({ content: content, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id))
            .returning();
        return reply.send((0, shared_1.createApiSuccess)(updated));
    });
    // DELETE /posts/:id
    app.delete("/posts/:id", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const [post] = await index_js_1.db
            .select()
            .from(schema_js_1.posts)
            .where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id))
            .limit(1);
        if (!post) {
            return reply.code(404).send((0, shared_1.createApiError)("POST_NOT_FOUND", "Post not found"));
        }
        if (post.authorId !== request.authUser.id && request.authUser.role !== "admin") {
            return reply.code(403).send((0, shared_1.createApiError)("FORBIDDEN", "Cannot delete other users' posts"));
        }
        await index_js_1.db.delete(schema_js_1.posts).where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id));
        return reply.send((0, shared_1.createApiSuccess)({ message: "Post deleted" }));
    });
    // POST /posts/:id/like
    app.post("/posts/:id/like", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [post] = await index_js_1.db
            .select()
            .from(schema_js_1.posts)
            .where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id))
            .limit(1);
        if (!post) {
            return reply.code(404).send((0, shared_1.createApiError)("POST_NOT_FOUND", "Post not found"));
        }
        const [existing] = await index_js_1.db
            .select()
            .from(schema_js_1.postLikes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.postLikes.postId, id), (0, drizzle_orm_1.eq)(schema_js_1.postLikes.userId, currentUserId)))
            .limit(1);
        if (existing) {
            return reply.code(400).send((0, shared_1.createApiError)("ALREADY_LIKED", "Post already liked"));
        }
        await index_js_1.db.insert(schema_js_1.postLikes).values({ postId: id, userId: currentUserId });
        return reply.send((0, shared_1.createApiSuccess)({ liked: true }));
    });
    // DELETE /posts/:id/like
    app.delete("/posts/:id/like", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const currentUserId = request.authUser.id;
        const [existing] = await index_js_1.db
            .select()
            .from(schema_js_1.postLikes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.postLikes.postId, id), (0, drizzle_orm_1.eq)(schema_js_1.postLikes.userId, currentUserId)))
            .limit(1);
        if (!existing) {
            return reply.code(404).send((0, shared_1.createApiError)("NOT_LIKED", "Post not liked"));
        }
        await index_js_1.db.delete(schema_js_1.postLikes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.postLikes.postId, id), (0, drizzle_orm_1.eq)(schema_js_1.postLikes.userId, currentUserId)));
        return reply.send((0, shared_1.createApiSuccess)({ liked: false }));
    });
    // GET /posts/:id/comments
    app.get("/posts/:id/comments", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const query = request.query;
        const pageNum = Math.max(1, parseInt(query.page || "1", 10));
        const limitNum = Math.min(50, Math.max(1, parseInt(query.limit || "50", 10)));
        const offset = (pageNum - 1) * limitNum;
        const [post] = await index_js_1.db
            .select()
            .from(schema_js_1.posts)
            .where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id))
            .limit(1);
        if (!post) {
            return reply.code(404).send((0, shared_1.createApiError)("POST_NOT_FOUND", "Post not found"));
        }
        const commentsWithAuthors = await index_js_1.db
            .select({
            comment: schema_js_1.comments,
            authorProfile: schema_js_1.profiles,
        })
            .from(schema_js_1.comments)
            .innerJoin(schema_js_1.profiles, (0, drizzle_orm_1.eq)(schema_js_1.comments.authorId, schema_js_1.profiles.userId))
            .where((0, drizzle_orm_1.eq)(schema_js_1.comments.postId, id))
            .orderBy(schema_js_1.comments.createdAt)
            .limit(limitNum)
            .offset(offset);
        const [{ totalCount }] = await index_js_1.db
            .select({ totalCount: (0, drizzle_orm_1.count)() })
            .from(schema_js_1.comments)
            .where((0, drizzle_orm_1.eq)(schema_js_1.comments.postId, id));
        const total = Number(totalCount);
        const totalPages = Math.ceil(total / limitNum);
        const items = commentsWithAuthors.map((c) => ({
            ...c.comment,
            author: {
                ...c.authorProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: c.comment.authorId === request.authUser.id,
            },
        }));
        return reply.send((0, shared_1.createApiSuccess)({ items, page: pageNum, limit: limitNum, total, totalPages }));
    });
    // POST /posts/:id/comments
    app.post("/posts/:id/comments", { preHandler: [app.requireApproved] }, async (request, reply) => {
        const { id } = request.params;
        const { content } = request.body;
        const currentUserId = request.authUser.id;
        const [post] = await index_js_1.db
            .select()
            .from(schema_js_1.posts)
            .where((0, drizzle_orm_1.eq)(schema_js_1.posts.id, id))
            .limit(1);
        if (!post) {
            return reply.code(404).send((0, shared_1.createApiError)("POST_NOT_FOUND", "Post not found"));
        }
        const [comment] = await index_js_1.db
            .insert(schema_js_1.comments)
            .values({ postId: id, authorId: currentUserId, content })
            .returning();
        const [authorProfile] = await index_js_1.db
            .select()
            .from(schema_js_1.profiles)
            .where((0, drizzle_orm_1.eq)(schema_js_1.profiles.userId, currentUserId))
            .limit(1);
        return reply.code(201).send((0, shared_1.createApiSuccess)({
            ...comment,
            author: {
                ...authorProfile,
                connectionStatus: "connected",
                connectionCount: 0,
                isOwnProfile: true,
            },
        }));
    });
}
