import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { profiles, users, membershipApplications } from "../db/schema.js";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  ProfileSchema,
  UpdateProfileSchema,
  OnboardingSchema,
  PublicProfileSchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

export async function registerProfileRoutes(app: FastifyInstance) {
  // GET /profiles/me
  app.get(
    "/profiles/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, request.authUser!.id))
        .limit(1);

      if (!profile) {
        return reply.code(404).send(
          createApiError("PROFILE_NOT_FOUND", "Profile not found")
        );
      }

      return reply.send(createApiSuccess(profile));
    }
  );

  // PATCH /profiles/me
  app.patch(
    "/profiles/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const input = request.body as z.infer<typeof UpdateProfileSchema>;

      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, request.authUser!.id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send(
          createApiError("PROFILE_NOT_FOUND", "Profile not found")
        );
      }

      const [application] = await db
        .select({ status: membershipApplications.status })
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, request.authUser!.id))
        .limit(1);

      const status = application?.status || "pending";
      if (status === "suspended") {
        return reply.code(403).send(
          createApiError("ACCOUNT_SUSPENDED", "Account is suspended")
        );
      }

      const [updated] = await db
        .update(profiles)
        .set({
          ...input,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString().split('T')[0] : undefined,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, request.authUser!.id))
        .returning();

      return reply.send(createApiSuccess(updated));
    }
  );

  // POST /profiles/me/onboarding
  app.post(
    "/profiles/me/onboarding",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const input = request.body as z.infer<typeof OnboardingSchema>;

      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, request.authUser!.id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send(
          createApiError("PROFILE_NOT_FOUND", "Profile not found")
        );
      }

      if (existing.onboardingCompleted) {
        return reply.code(400).send(
          createApiError("ONBOARDING_COMPLETED", "Onboarding already completed")
        );
      }

      const [updated] = await db
        .update(profiles)
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
        .where(eq(profiles.userId, request.authUser!.id))
        .returning();

      const [application] = await db
        .select()
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, request.authUser!.id))
        .limit(1);

      if (!application) {
        await db.insert(membershipApplications).values({
          userId: request.authUser!.id,
          status: "pending",
        });
      } else if (application.status === "rejected") {
        await db
          .update(membershipApplications)
          .set({ status: "pending", reviewedAt: null, reviewedBy: null, rejectionReason: null, updatedAt: new Date() })
          .where(eq(membershipApplications.userId, request.authUser!.id));
      }

      return reply.send(createApiSuccess(updated));
    }
  );

  // GET /profiles/:id
  app.get(
    "/profiles/:id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const currentUserId = request.authUser!.id;

      const [targetProfile] = await db
        .select({
          profile: profiles,
          user: users,
        })
        .from(profiles)
        .innerJoin(users, eq(profiles.userId, users.id))
        .where(eq(profiles.userId, id))
        .limit(1);

      if (!targetProfile) {
        return reply.code(404).send(
          createApiError("PROFILE_NOT_FOUND", "Profile not found")
        );
      }

      const { profile, user } = targetProfile;

      const [targetApplication] = await db
        .select({ status: membershipApplications.status })
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, id))
        .limit(1);

      if (!targetApplication || targetApplication.status !== "approved") {
        return reply.code(404).send(
          createApiError("PROFILE_NOT_FOUND", "Profile not found")
        );
      }

      if (profile.visibility === "private" && profile.userId !== currentUserId) {
        return reply.code(404).send(
          createApiError("PROFILE_PRIVATE", "This profile is private")
        );
      }

      let connectionStatus: "none" | "pending_sent" | "pending_received" | "connected" = "none";
      
      if (profile.visibility === "connections" && profile.userId !== currentUserId) {
        const { connections, connectionRequests } = await import("../db/schema.js");
        const [conn] = await db
          .select()
          .from(connections)
          .where(
            and(
              eq(connections.userOneId, currentUserId),
              eq(connections.userTwoId, id)
            )
          )
          .limit(1);

        const [conn2] = await db
          .select()
          .from(connections)
          .where(
            and(
              eq(connections.userOneId, id),
              eq(connections.userTwoId, currentUserId)
            )
          )
          .limit(1);

        if (conn || conn2) {
          connectionStatus = "connected";
        } else {
          const [sent] = await db
            .select()
            .from(connectionRequests)
            .where(
              and(
                eq(connectionRequests.senderId, currentUserId),
                eq(connectionRequests.receiverId, id),
                eq(connectionRequests.status, "pending")
              )
            )
            .limit(1);

          const [received] = await db
            .select()
            .from(connectionRequests)
            .where(
              and(
                eq(connectionRequests.senderId, id),
                eq(connectionRequests.receiverId, currentUserId),
                eq(connectionRequests.status, "pending")
              )
            )
            .limit(1);

          if (sent) connectionStatus = "pending_sent";
          else if (received) connectionStatus = "pending_received";
        }

        if (connectionStatus === "none") {
          return reply.code(404).send(
            createApiError("PROFILE_PRIVATE", "This profile is only visible to connections")
          );
        }
      }

      const publicProfile = {
        ...profile,
        connectionStatus,
        connectionCount: 0,
        isOwnProfile: profile.userId === currentUserId,
      };

      return reply.send(createApiSuccess(publicProfile));
    }
  );
}