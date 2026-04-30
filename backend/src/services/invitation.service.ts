/**
 * @file invitation.service.ts
 * @description Hiring manager invitation flow — create, validate, accept, list, cancel.
 *
 * Invitations use the UserInvitation model. Each invitation has a unique token
 * (auto-generated cuid) and expires after 7 days.
 */
import { prisma } from '../lib/prisma';
import type { UserRole } from '@prisma/client';

// ── Constants ────────────────────────────────────────────────────────────────

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ALLOWED_DOMAIN = 'ordios.com';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreateInvitationInput {
  email: string;
  role: UserRole;
  invitedById: string;
  jobIds?: string[];
}

interface InvitationDto {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  jobIds: string[];
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const invitationService = {
  /**
   * Create an invitation for a new team member.
   * Only @ordios.com emails are allowed.
   */
  async createInvitation(input: CreateInvitationInput): Promise<InvitationDto> {
    const domain = input.email.split('@')[1];
    if (domain !== ALLOWED_DOMAIN) {
      throw serviceError(400, 'DOMAIN_NOT_ALLOWED', `Only @${ALLOWED_DOMAIN} emails can be invited`);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw serviceError(409, 'USER_EXISTS', 'A user with this email already exists');
    }

    // Check for existing pending invitation
    const existing = await prisma.userInvitation.findUnique({ where: { email: input.email } });
    if (existing && !existing.acceptedAt && existing.expiresAt > new Date()) {
      throw serviceError(409, 'INVITATION_EXISTS', 'A pending invitation already exists for this email');
    }

    // If there's an expired/accepted invitation, delete it first (email is unique)
    if (existing) {
      await prisma.userInvitation.delete({ where: { id: existing.id } });
    }

    const invitation = await prisma.userInvitation.create({
      data: {
        email: input.email,
        role: input.role,
        invitedById: input.invitedById,
        jobIds: input.jobIds ?? [],
        expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
      },
    });

    return toDto(invitation);
  },

  /**
   * Validate an invitation token — returns the invitation if valid.
   */
  async validateInvitation(token: string): Promise<InvitationDto> {
    const invitation = await prisma.userInvitation.findUnique({ where: { token } });
    if (!invitation) {
      throw serviceError(404, 'INVITATION_NOT_FOUND', 'Invitation not found');
    }
    if (invitation.acceptedAt) {
      throw serviceError(410, 'INVITATION_ALREADY_ACCEPTED', 'This invitation has already been accepted');
    }
    if (invitation.expiresAt < new Date()) {
      throw serviceError(410, 'INVITATION_EXPIRED', 'This invitation has expired');
    }
    return toDto(invitation);
  },

  /**
   * Accept an invitation — marks it as accepted.
   * The actual user creation happens during Google SSO callback;
   * this just records that the invitation was used.
   */
  async acceptInvitation(token: string, userId: string): Promise<InvitationDto> {
    const invitation = await prisma.userInvitation.findUnique({ where: { token } });
    if (!invitation) {
      throw serviceError(404, 'INVITATION_NOT_FOUND', 'Invitation not found');
    }
    if (invitation.acceptedAt) {
      throw serviceError(410, 'INVITATION_ALREADY_ACCEPTED', 'This invitation has already been accepted');
    }
    if (invitation.expiresAt < new Date()) {
      throw serviceError(410, 'INVITATION_EXPIRED', 'This invitation has expired');
    }

    // Update the user's role to match the invitation
    await prisma.user.update({
      where: { id: userId },
      data: { role: invitation.role },
    });

    // Mark invitation as accepted
    const updated = await prisma.userInvitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    return toDto(updated);
  },

  /**
   * List all invitations (for admin/HR settings page).
   */
  async listInvitations(): Promise<InvitationDto[]> {
    const invitations = await prisma.userInvitation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(toDto);
  },

  /**
   * Cancel (delete) a pending invitation.
   */
  async cancelInvitation(id: string): Promise<void> {
    const invitation = await prisma.userInvitation.findUnique({ where: { id } });
    if (!invitation) {
      throw serviceError(404, 'INVITATION_NOT_FOUND', 'Invitation not found');
    }
    if (invitation.acceptedAt) {
      throw serviceError(400, 'INVITATION_ACCEPTED', 'Cannot cancel an accepted invitation');
    }
    await prisma.userInvitation.delete({ where: { id } });
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDto(inv: {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  jobIds: string[];
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
}): InvitationDto {
  let status: 'pending' | 'accepted' | 'expired' = 'pending';
  if (inv.acceptedAt) status = 'accepted';
  else if (inv.expiresAt < new Date()) status = 'expired';

  return {
    id: inv.id,
    email: inv.email,
    role: inv.role,
    token: inv.token,
    jobIds: inv.jobIds,
    status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    acceptedAt: inv.acceptedAt?.toISOString() ?? null,
  };
}

function serviceError(statusCode: number, code: string, message: string) {
  return { statusCode, code, message };
}
