import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const UserRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const MembershipStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "suspended",
]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const ConnectionRequestStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);
export type ConnectionRequestStatus = z.infer<
  typeof ConnectionRequestStatusSchema
>;

export const ProfileVisibilitySchema = z.enum([
  "community",
  "connections",
  "private",
]);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

// ============================================================================
// User & Auth
// ============================================================================

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const JWTPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  membershipStatus: MembershipStatusSchema.nullable(),
  iat: z.number(),
  exp: z.number(),
});
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// ============================================================================
// Profile
// ============================================================================

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string(),
  avatarUrl: z.string().url().nullable(),
  dateOfBirth: z.date().nullable(),
  city: z.string().nullable(),
  hometown: z.string().nullable(),
  bio: z.string().nullable(),
  profession: z.string().nullable(),
  education: z.string().nullable(),
  interests: z.array(z.string()),
  visibility: ProfileVisibilitySchema,
  onboardingCompleted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  hometown: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  profession: z.string().max(100).nullable().optional(),
  education: z.string().max(100).nullable().optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  visibility: ProfileVisibilitySchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const OnboardingSchema = UpdateProfileSchema.extend({
  fullName: z.string().min(2).max(100),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export const PublicProfileSchema = ProfileSchema.omit({
  userId: true,
  onboardingCompleted: true,
}).extend({
  connectionStatus: z.enum(["none", "pending_sent", "pending_received", "connected"]),
  connectionCount: z.number().optional(),
  isOwnProfile: z.boolean(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

// ============================================================================
// Membership Application
// ============================================================================

export const MembershipApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: MembershipStatusSchema,
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MembershipApplication = z.infer<typeof MembershipApplicationSchema>;

export const MembershipStatusResponseSchema = z.object({
  status: MembershipStatusSchema,
  reviewedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
});
export type MembershipStatusResponse = z.infer<typeof MembershipStatusResponseSchema>;

export const AdminApplicationDetailSchema = MembershipApplicationSchema.extend({
  user: UserSchema,
  profile: ProfileSchema,
});
export type AdminApplicationDetail = z.infer<typeof AdminApplicationDetailSchema>;

export const ApproveApplicationSchema = z.object({});
export const RejectApplicationSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

// ============================================================================
// Posts & Feed
// ============================================================================

export const PostSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(5000),
});
export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = CreatePostSchema.partial();
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

export const PostWithAuthorSchema = PostSchema.extend({
  author: PublicProfileSchema,
  likeCount: z.number(),
  commentCount: z.number(),
  isLiked: z.boolean(),
});
export type PostWithAuthor = z.infer<typeof PostWithAuthorSchema>;

export const CommentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const CommentWithAuthorSchema = CommentSchema.extend({
  author: PublicProfileSchema,
});
export type CommentWithAuthor = z.infer<typeof CommentWithAuthorSchema>;

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20),
});
export type PaginationParams = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });

// ============================================================================
// Connections
// ============================================================================

export const ConnectionRequestSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  status: ConnectionRequestStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>;

export const ConnectionRequestWithProfilesSchema = ConnectionRequestSchema.extend({
  sender: PublicProfileSchema,
  receiver: PublicProfileSchema,
});
export type ConnectionRequestWithProfiles = z.infer<
  typeof ConnectionRequestWithProfilesSchema
>;

export const ConnectionSchema = z.object({
  id: z.string().uuid(),
  userOneId: z.string().uuid(),
  userTwoId: z.string().uuid(),
  createdAt: z.date(),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const ConnectionWithProfileSchema = ConnectionSchema.extend({
  otherUser: PublicProfileSchema,
});
export type ConnectionWithProfile = z.infer<typeof ConnectionWithProfileSchema>;

export const SendConnectionRequestSchema = z.object({
  receiverId: z.string().uuid(),
});
export type SendConnectionRequestInput = z.infer<typeof SendConnectionRequestSchema>;

// ============================================================================
// Discover
// ============================================================================

export const DiscoverFiltersSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20),
});
export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>;

export const DiscoverResultSchema = PublicProfileSchema.extend({
  mutualConnections: z.number().optional(),
});
export type DiscoverResult = z.infer<typeof DiscoverResultSchema>;

// ============================================================================
// Messaging
// ============================================================================

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationMemberSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  lastReadAt: z.date().nullable(),
});
export type ConversationMember = z.infer<typeof ConversationMemberSchema>;

export const ConversationWithDetailsSchema = ConversationSchema.extend({
  members: z.array(
    ConversationMemberSchema.extend({
      user: PublicProfileSchema,
    })
  ),
  lastMessage: z
    .object({
      id: z.string().uuid(),
      content: z.string(),
      senderId: z.string().uuid(),
      createdAt: z.date(),
    })
    .nullable(),
  unreadCount: z.number(),
});
export type ConversationWithDetails = z.infer<typeof ConversationWithDetailsSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
});
export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000),
});
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export const CreateConversationSchema = z.object({
  participantId: z.string().uuid(),
});
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const MessageWithSenderSchema = MessageSchema.extend({
  sender: PublicProfileSchema,
});
export type MessageWithSender = z.infer<typeof MessageWithSenderSchema>;

// ============================================================================
// Settings
// ============================================================================

export const UpdatePrivacySchema = z.object({
  visibility: ProfileVisibilitySchema,
});
export type UpdatePrivacyInput = z.infer<typeof UpdatePrivacySchema>;

// ============================================================================
// API Response Wrappers
// ============================================================================

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// Helpers
// ============================================================================

export function createApiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return { success: false, error: { code, message, details } };
}