import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { profiles, users, membershipApplications } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hash, verify } from "argon2";
import {
  UpdatePrivacySchema,
  ProfileVisibilitySchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

export async function registerSettingsRoutes(app: FastifyInstance) {
  // PATCH /settings/privacy
  app.patch(
    "/settings/privacy",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { visibility } = request.body as z.infer<typeof UpdatePrivacySchema>;

      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, request.authUser!.id))
        .limit(1);

      if (!profile) {
        return reply.code(404).send(createApiError("PROFILE_NOT_FOUND", "Profile not found"));
      }

      const [updated] = await db
        .update(profiles)
        .set({ visibility, updatedAt: new Date() })
        .where(eq(profiles.userId, request.authUser!.id))
        .returning();

      return reply.send(createApiSuccess(updated));
    }
  );

  // POST /settings/password
  app.post(
    "/settings/password",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      });

      const { currentPassword, newPassword } = request.body as z.infer<typeof schema>;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.authUser!.id))
        .limit(1);

      if (!user) {
        return reply.code(404).send(createApiError("USER_NOT_FOUND", "User not found"));
      }

      const valid = await verify(user.passwordHash, currentPassword);
      if (!valid) {
        return reply.code(401).send(createApiError("INVALID_PASSWORD", "Current password is incorrect"));
      }

      const newPasswordHash = await hash(newPassword, { type: 2 });

      await db
        .update(users)
        .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
        .where(eq(users.id, request.authUser!.id));

      return reply.send(createApiSuccess({ message: "Password updated successfully" }));
    }
  );

  // DELETE /account
  app.delete(
    "/account",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const schema = z.object({
        password: z.string().min(1),
        confirm: z.literal(true),
      });

      const { password, confirm } = request.body as z.infer<typeof schema>;

      if (!confirm) {
        return reply.code(400).send(createApiError("CONFIRMATION_REQUIRED", "Must confirm account deletion"));
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.authUser!.id))
        .limit(1);

      if (!user) {
        return reply.code(404).send(createApiError("USER_NOT_FOUND", "User not found"));
      }

      const valid = await verify(user.passwordHash, password);
      if (!valid) {
        return reply.code(401).send(createApiError("INVALID_PASSWORD", "Password is incorrect"));
      }

      await db.delete(users).where(eq(users.id, request.authUser!.id));

      return reply.send(createApiSuccess({ message: "Account deleted successfully" }));
    }
  );
}