import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { membershipApplications, users, profiles } from "../db/schema.js";
import { eq, and, desc, count } from "drizzle-orm";
import {
  MembershipStatusSchema,
  MembershipApplicationSchema,
  AdminApplicationDetailSchema,
  ApproveApplicationSchema,
  RejectApplicationSchema,
  MembershipStatusResponseSchema,
  createApiSuccess,
  createApiError,
} from "@levaconnect/shared";

export async function registerMembershipRoutes(app: FastifyInstance) {
  app.get(
    "/membership/status",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const [application] = await db
        .select()
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, request.authUser!.id))
        .limit(1);

      if (!application) {
        return reply.code(404).send(
          createApiError("APPLICATION_NOT_FOUND", "No membership application found")
        );
      }

      return reply.send(
        createApiSuccess({
          status: application.status,
          reviewedAt: application.reviewedAt,
          rejectionReason: application.rejectionReason,
        })
      );
    }
  );

  app.post(
    "/membership/apply",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const [existing] = await db
        .select()
        .from(membershipApplications)
        .where(eq(membershipApplications.userId, request.authUser!.id))
        .limit(1);

      if (existing) {
        if (existing.status === "pending") {
          return reply.code(400).send(
            createApiError("ALREADY_PENDING", "Application already pending")
          );
        }
        if (existing.status === "approved") {
          return reply.code(400).send(
            createApiError("ALREADY_APPROVED", "Already approved")
          );
        }
        if (existing.status === "suspended") {
          return reply.code(403).send(
            createApiError("ACCOUNT_SUSPENDED", "Account is suspended")
          );
        }
        await db
          .update(membershipApplications)
          .set({ status: "pending", reviewedAt: null, reviewedBy: null, rejectionReason: null, updatedAt: new Date() })
          .where(eq(membershipApplications.userId, request.authUser!.id));
      } else {
        await db.insert(membershipApplications).values({
          userId: request.authUser!.id,
          status: "pending",
        });
      }

      return reply.send(createApiSuccess({ message: "Application submitted" }));
    }
  );

  app.get(
    "/admin/applications",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string; status?: string };
      const page = Math.max(1, parseInt(query.page || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt(query.limit || "20", 10)));
      const status = query.status as "pending" | "approved" | "rejected" | "suspended" | undefined;
      const offset = (page - 1) * limit;

      let whereClause;
      if (status) {
        whereClause = eq(membershipApplications.status, status);
      }

      const [applications, [{ count: totalCount }]] = await Promise.all([
        db
          .select({
            application: membershipApplications,
            user: users,
            profile: profiles,
          })
          .from(membershipApplications)
          .innerJoin(users, eq(membershipApplications.userId, users.id))
          .leftJoin(profiles, eq(profiles.userId, users.id))
          .where(whereClause)
          .orderBy(desc(membershipApplications.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(membershipApplications)
          .where(whereClause),
      ]);

      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limit);

      return reply.send(
        createApiSuccess({
          items: applications.map((a) => ({
            ...a.application,
            user: a.user,
            profile: a.profile,
          })),
          page,
          limit,
          total,
          totalPages,
        })
      );
    }
  );

  app.post(
    "/admin/applications/:id/approve",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });

      const [application] = await db
        .select()
        .from(membershipApplications)
        .where(eq(membershipApplications.id, id))
        .limit(1);

      if (!application) {
        return reply.code(404).send(
          createApiError("APPLICATION_NOT_FOUND", "Application not found")
        );
      }

      if (application.status !== "pending") {
        return reply.code(400).send(
          createApiError("INVALID_STATUS", "Application is not pending")
        );
      }

      await db
        .update(membershipApplications)
        .set({
          status: "approved",
          reviewedBy: request.authUser!.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(membershipApplications.id, id));

      return reply.send(createApiSuccess({ message: "Application approved" }));
    }
  );

  app.post(
    "/admin/applications/:id/reject",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const { id } = (request.params as { id: string });
      const { reason } = request.body as z.infer<typeof RejectApplicationSchema>;

      const [application] = await db
        .select()
        .from(membershipApplications)
        .where(eq(membershipApplications.id, id))
        .limit(1);

      if (!application) {
        return reply.code(404).send(
          createApiError("APPLICATION_NOT_FOUND", "Application not found")
        );
      }

      if (application.status !== "pending") {
        return reply.code(400).send(
          createApiError("INVALID_STATUS", "Application is not pending")
        );
      }

      await db
        .update(membershipApplications)
        .set({
          status: "rejected",
          reviewedBy: request.authUser!.id,
          reviewedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(membershipApplications.id, id));

      return reply.send(createApiSuccess({ message: "Application rejected" }));
    }
  );
}