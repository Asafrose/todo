import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

// Input schemas with validation
const createTeamInput = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  description: z.string().optional(),
});

const updateTeamInput = z.object({
  teamId: z.string(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

const addMemberInput = z.object({
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(["owner", "member", "viewer"]).default("member"),
});

const removeMemberInput = z.object({
  teamId: z.string(),
  userId: z.string(),
});

const createInviteInput = z.object({
  teamId: z.string(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "member", "viewer"]).default("member"),
  expiresAt: z.date().optional(),
});

const acceptInviteInput = z.object({
  token: z.string(),
});

const revokeInviteInput = z.object({
  inviteId: z.string(),
});

// Helper to check if user is team owner
async function isTeamOwner(teamId: string, userId: string): Promise<boolean> {
  const member = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });

  return member?.role === "owner";
}

export const teamRouter = createTRPCRouter({
  // Create a new team
  create: protectedProcedure
    .input(createTeamInput)
    .mutation(async ({ ctx, input }) => {
      const team = await prisma.team.create({
        data: {
          ...input,
          members: {
            create: {
              userId: ctx.user.id,
              role: "owner",
            },
          },
        },
        include: {
          members: true,
        },
      });

      return team;
    }),

  // List user's teams
  list: protectedProcedure.query(async ({ ctx }) => {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: ctx.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return teams;
  }),

  // Get team details
  getById: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await prisma.team.findUnique({
        where: { id: input.teamId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      // Check if user is member
      const isMember = team.members.some((m) => m.userId === ctx.user.id);
      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to access this team",
        });
      }

      return team;
    }),

  // Update team
  update: protectedProcedure
    .input(updateTeamInput)
    .mutation(async ({ ctx, input }) => {
      const { teamId, ...updateData } = input;

      // Check if user is team owner
      const isOwner = await isTeamOwner(teamId, ctx.user.id);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can update team details",
        });
      }

      const team = await prisma.team.update({
        where: { id: teamId },
        data: Object.fromEntries(
          Object.entries(updateData).filter(([, value]) => value !== undefined)
        ),
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return team;
    }),

  // Delete team
  delete: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is team owner
      const isOwner = await isTeamOwner(input.teamId, ctx.user.id);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can delete the team",
        });
      }

      await prisma.team.delete({
        where: { id: input.teamId },
      });

      return { success: true };
    }),

  // Add member to team
  addMember: protectedProcedure
    .input(addMemberInput)
    .mutation(async ({ ctx, input }) => {
      // Check if user is team owner
      const isOwner = await isTeamOwner(input.teamId, ctx.user.id);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can add members",
        });
      }

      // Check if user already exists
      const existing = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: input.userId,
            teamId: input.teamId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member of this team",
        });
      }

      const member = await prisma.teamMember.create({
        data: {
          userId: input.userId,
          teamId: input.teamId,
          role: input.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return member;
    }),

  // Remove member from team
  removeMember: protectedProcedure
    .input(removeMemberInput)
    .mutation(async ({ ctx, input }) => {
      // Check if user is team owner
      const isOwner = await isTeamOwner(input.teamId, ctx.user.id);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can remove members",
        });
      }

      // Prevent removing the last owner
      const members = await prisma.teamMember.findMany({
        where: { teamId: input.teamId, role: "owner" },
      });

      if (members.length === 1 && members[0].userId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the last owner from the team",
        });
      }

      await prisma.teamMember.delete({
        where: {
          userId_teamId: {
            userId: input.userId,
            teamId: input.teamId,
          },
        },
      });

      return { success: true };
    }),

  // Create team invitation
  createInvite: protectedProcedure
    .input(createInviteInput)
    .mutation(async ({ ctx, input }) => {
      // Check if user is team owner
      const isOwner = await isTeamOwner(input.teamId, ctx.user.id);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can invite members",
        });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

      const invite = await prisma.teamInvite.create({
        data: {
          email: input.email,
          token,
          role: input.role,
          teamId: input.teamId,
          invitedBy: ctx.user.id,
          expiresAt,
        },
      });

      return invite;
    }),

  // Accept invitation
  acceptInvite: protectedProcedure
    .input(acceptInviteInput)
    .mutation(async ({ ctx, input }) => {
      const invite = await prisma.teamInvite.findUnique({
        where: { token: input.token },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      if (invite.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invitation is ${invite.status}`,
        });
      }

      if (new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation has expired",
        });
      }

      // Check if email matches
      const user = await prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (!user || user.id !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      // Check if already a member
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.user.id,
            teamId: invite.teamId,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already a member of this team",
        });
      }

      // Add as member and mark invite as accepted
      const member = await prisma.teamMember.create({
        data: {
          userId: ctx.user.id,
          teamId: invite.teamId,
          role: invite.role,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });

      return member;
    }),

  // Revoke invitation
  revokeInvite: protectedProcedure
    .input(revokeInviteInput)
    .mutation(async ({ ctx, input }) => {
      const invite = await prisma.teamInvite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if user is team owner
      const isOwner = await isTeamOwner(invite.teamId, ctx.user.id);
      if (!isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only team owners can revoke invitations",
        });
      }

      await prisma.teamInvite.update({
        where: { id: input.inviteId },
        data: { status: "revoked" },
      });

      return { success: true };
    }),
});
