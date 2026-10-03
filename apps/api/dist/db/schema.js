"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRelations = exports.conversationMembersRelations = exports.conversationsRelations = exports.commentsRelations = exports.postLikesRelations = exports.postsRelations = exports.connectionsRelations = exports.connectionRequestsRelations = exports.membershipApplicationsRelations = exports.profilesRelations = exports.usersRelations = exports.messages = exports.conversationMembers = exports.conversations = exports.comments = exports.postLikes = exports.posts = exports.connections = exports.connectionRequests = exports.membershipApplications = exports.profiles = exports.users = exports.profileVisibilityEnum = exports.connectionRequestStatusEnum = exports.membershipStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// ============================================================================
// Enums
// ============================================================================
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["user", "admin"]);
exports.membershipStatusEnum = (0, pg_core_1.pgEnum)("membership_status", [
    "pending",
    "approved",
    "rejected",
    "suspended",
]);
exports.connectionRequestStatusEnum = (0, pg_core_1.pgEnum)("connection_request_status", [
    "pending",
    "accepted",
    "rejected",
    "cancelled",
]);
exports.profileVisibilityEnum = (0, pg_core_1.pgEnum)("profile_visibility", [
    "community",
    "connections",
    "private",
]);
// ============================================================================
// Tables
// ============================================================================
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)("password_hash", { length: 255 }).notNull(),
    role: (0, exports.userRoleEnum)("role").notNull().default("user"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.profiles = (0, pg_core_1.pgTable)("profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" })
        .unique(),
    fullName: (0, pg_core_1.varchar)("full_name", { length: 100 }).notNull(),
    avatarUrl: (0, pg_core_1.text)("avatar_url"),
    dateOfBirth: (0, pg_core_1.date)("date_of_birth"),
    city: (0, pg_core_1.varchar)("city", { length: 100 }),
    hometown: (0, pg_core_1.varchar)("hometown", { length: 100 }),
    bio: (0, pg_core_1.text)("bio"),
    profession: (0, pg_core_1.varchar)("profession", { length: 100 }),
    education: (0, pg_core_1.varchar)("education", { length: 100 }),
    interests: (0, pg_core_1.text)("interests").array().notNull().default([]),
    visibility: (0, exports.profileVisibilityEnum)("visibility")
        .notNull()
        .default("community"),
    onboardingCompleted: (0, pg_core_1.boolean)("onboarding_completed").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.membershipApplications = (0, pg_core_1.pgTable)("membership_applications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" })
        .unique(),
    status: (0, exports.membershipStatusEnum)("status").notNull().default("pending"),
    reviewedBy: (0, pg_core_1.uuid)("reviewed_by").references(() => exports.users.id, {
        onDelete: "set null",
    }),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at", { withTimezone: true }),
    rejectionReason: (0, pg_core_1.text)("rejection_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.connectionRequests = (0, pg_core_1.pgTable)("connection_requests", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    senderId: (0, pg_core_1.uuid)("sender_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    receiverId: (0, pg_core_1.uuid)("receiver_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    status: (0, exports.connectionRequestStatusEnum)("status")
        .notNull()
        .default("pending"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => ({
    uniqueSenderReceiver: (0, pg_core_1.uniqueIndex)("unique_sender_receiver").on(table.senderId, table.receiverId),
    senderIdx: (0, pg_core_1.index)("connection_requests_sender_idx").on(table.senderId),
    receiverIdx: (0, pg_core_1.index)("connection_requests_receiver_idx").on(table.receiverId),
    statusIdx: (0, pg_core_1.index)("connection_requests_status_idx").on(table.status),
}));
exports.connections = (0, pg_core_1.pgTable)("connections", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userOneId: (0, pg_core_1.uuid)("user_one_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    userTwoId: (0, pg_core_1.uuid)("user_two_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => ({
    uniqueUsers: (0, pg_core_1.uniqueIndex)("unique_connection_users").on(table.userOneId, table.userTwoId),
    userOneIdx: (0, pg_core_1.index)("connections_user_one_idx").on(table.userOneId),
    userTwoIdx: (0, pg_core_1.index)("connections_user_two_idx").on(table.userTwoId),
}));
exports.posts = (0, pg_core_1.pgTable)("posts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    authorId: (0, pg_core_1.uuid)("author_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.postLikes = (0, pg_core_1.pgTable)("post_likes", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    postId: (0, pg_core_1.uuid)("post_id")
        .notNull()
        .references(() => exports.posts.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => ({
    uniquePostUser: (0, pg_core_1.uniqueIndex)("unique_post_like").on(table.postId, table.userId),
    postIdx: (0, pg_core_1.index)("post_likes_post_idx").on(table.postId),
    userIdx: (0, pg_core_1.index)("post_likes_user_idx").on(table.userId),
}));
exports.comments = (0, pg_core_1.pgTable)("comments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    postId: (0, pg_core_1.uuid)("post_id")
        .notNull()
        .references(() => exports.posts.id, { onDelete: "cascade" }),
    authorId: (0, pg_core_1.uuid)("author_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.conversations = (0, pg_core_1.pgTable)("conversations", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.conversationMembers = (0, pg_core_1.pgTable)("conversation_members", {
    conversationId: (0, pg_core_1.uuid)("conversation_id")
        .notNull()
        .references(() => exports.conversations.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    lastReadAt: (0, pg_core_1.timestamp)("last_read_at", { withTimezone: true }),
}, (table) => ({
    pk: (0, pg_core_1.primaryKey)({ columns: [table.conversationId, table.userId] }),
    conversationIdx: (0, pg_core_1.index)("conversation_members_conversation_idx").on(table.conversationId),
    userIdx: (0, pg_core_1.index)("conversation_members_user_idx").on(table.userId),
}));
exports.messages = (0, pg_core_1.pgTable)("messages", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    conversationId: (0, pg_core_1.uuid)("conversation_id")
        .notNull()
        .references(() => exports.conversations.id, { onDelete: "cascade" }),
    senderId: (0, pg_core_1.uuid)("sender_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
// ============================================================================
// Relations
// ============================================================================
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    profile: one(exports.profiles, { fields: [exports.users.id], references: [exports.profiles.userId] }),
    membershipApplication: one(exports.membershipApplications, {
        fields: [exports.users.id],
        references: [exports.membershipApplications.userId],
    }),
    sentConnectionRequests: many(exports.connectionRequests, {
        relationName: "sentRequests",
    }),
    receivedConnectionRequests: many(exports.connectionRequests, {
        relationName: "receivedRequests",
    }),
    connectionsAsUserOne: many(exports.connections, { relationName: "userOne" }),
    connectionsAsUserTwo: many(exports.connections, { relationName: "userTwo" }),
    posts: many(exports.posts),
    postLikes: many(exports.postLikes),
    comments: many(exports.comments),
    conversationMembers: many(exports.conversationMembers),
    sentMessages: many(exports.messages),
    reviewedApplications: many(exports.membershipApplications, {
        relationName: "reviewedApplications",
    }),
}));
exports.profilesRelations = (0, drizzle_orm_1.relations)(exports.profiles, ({ one }) => ({
    user: one(exports.users, { fields: [exports.profiles.userId], references: [exports.users.id] }),
}));
exports.membershipApplicationsRelations = (0, drizzle_orm_1.relations)(exports.membershipApplications, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.membershipApplications.userId],
        references: [exports.users.id],
    }),
    reviewedBy: one(exports.users, {
        fields: [exports.membershipApplications.reviewedBy],
        references: [exports.users.id],
        relationName: "reviewedApplications",
    }),
}));
exports.connectionRequestsRelations = (0, drizzle_orm_1.relations)(exports.connectionRequests, ({ one }) => ({
    sender: one(exports.users, {
        fields: [exports.connectionRequests.senderId],
        references: [exports.users.id],
        relationName: "sentRequests",
    }),
    receiver: one(exports.users, {
        fields: [exports.connectionRequests.receiverId],
        references: [exports.users.id],
        relationName: "receivedRequests",
    }),
}));
exports.connectionsRelations = (0, drizzle_orm_1.relations)(exports.connections, ({ one }) => ({
    userOne: one(exports.users, {
        fields: [exports.connections.userOneId],
        references: [exports.users.id],
        relationName: "userOne",
    }),
    userTwo: one(exports.users, {
        fields: [exports.connections.userTwoId],
        references: [exports.users.id],
        relationName: "userTwo",
    }),
}));
exports.postsRelations = (0, drizzle_orm_1.relations)(exports.posts, ({ one, many }) => ({
    author: one(exports.users, { fields: [exports.posts.authorId], references: [exports.users.id] }),
    likes: many(exports.postLikes),
    comments: many(exports.comments),
}));
exports.postLikesRelations = (0, drizzle_orm_1.relations)(exports.postLikes, ({ one }) => ({
    post: one(exports.posts, { fields: [exports.postLikes.postId], references: [exports.posts.id] }),
    user: one(exports.users, { fields: [exports.postLikes.userId], references: [exports.users.id] }),
}));
exports.commentsRelations = (0, drizzle_orm_1.relations)(exports.comments, ({ one }) => ({
    post: one(exports.posts, { fields: [exports.comments.postId], references: [exports.posts.id] }),
    author: one(exports.users, { fields: [exports.comments.authorId], references: [exports.users.id] }),
}));
exports.conversationsRelations = (0, drizzle_orm_1.relations)(exports.conversations, ({ many }) => ({
    members: many(exports.conversationMembers),
    messages: many(exports.messages),
}));
exports.conversationMembersRelations = (0, drizzle_orm_1.relations)(exports.conversationMembers, ({ one }) => ({
    conversation: one(exports.conversations, {
        fields: [exports.conversationMembers.conversationId],
        references: [exports.conversations.id],
    }),
    user: one(exports.users, {
        fields: [exports.conversationMembers.userId],
        references: [exports.users.id],
    }),
}));
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    conversation: one(exports.conversations, {
        fields: [exports.messages.conversationId],
        references: [exports.conversations.id],
    }),
    sender: one(exports.users, { fields: [exports.messages.senderId], references: [exports.users.id] }),
}));
