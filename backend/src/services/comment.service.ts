/**
 * @file comment.service.ts
 * @description Business logic for candidate comments and @mentions.
 */
import { prisma } from '../lib/prisma';
import { commentRepository } from '../repositories/comment.repository';
import { notificationsService } from './notifications.service';

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

export const commentService = {
  async addComment(params: {
    candidateId: string;
    applicationId?: string;
    authorId: string;
    body: string;
    authorRole: string;
  }) {
    // INTERVIEWER cannot comment
    if (params.authorRole === 'INTERVIEWER') {
      const err = new Error('Interviewers cannot add comments');
      (err as Error & { code: string }).code = 'FORBIDDEN';
      throw err;
    }

    // Parse @mentions from body
    const mentionMatches: { name: string; userId: string }[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
    while ((match = regex.exec(params.body)) !== null) {
      mentionMatches.push({ name: match[1], userId: match[2] });
    }

    // Resolve valid mentions — only users who are JobMembers on a job this candidate applied to
    const validMentionUserIds: string[] = [];
    if (mentionMatches.length > 0) {
      const applications = await prisma.application.findMany({
        where: { candidateId: params.candidateId, candidate: { deletedAt: null } },
        select: { jobPostingId: true },
      });
      const jobIds = applications.map((a) => a.jobPostingId);

      if (jobIds.length > 0) {
        const members = await prisma.jobMember.findMany({
          where: {
            jobId: { in: jobIds },
            userId: { in: mentionMatches.map((m) => m.userId) },
          },
          select: { userId: true },
        });
        const memberSet = new Set(members.map((m) => m.userId));
        for (const m of mentionMatches) {
          if (memberSet.has(m.userId)) {
            validMentionUserIds.push(m.userId);
          }
        }
      }

      // ADMIN/HR can also be mentioned even if not a JobMember
      if (validMentionUserIds.length < mentionMatches.length) {
        const remaining = mentionMatches
          .filter((m) => !validMentionUserIds.includes(m.userId))
          .map((m) => m.userId);
        if (remaining.length > 0) {
          const admins = await prisma.user.findMany({
            where: { id: { in: remaining }, role: { in: ['ADMIN', 'HR'] } },
            select: { id: true },
          });
          for (const a of admins) {
            validMentionUserIds.push(a.id);
          }
        }
      }
    }

    // Create comment with mentions
    const comment = await commentRepository.create({
      candidateId: params.candidateId,
      applicationId: params.applicationId,
      authorId: params.authorId,
      body: params.body,
      mentions: validMentionUserIds.map((userId) => ({ userId })),
    });

    // Author name from the already-included relation (no extra query)
    const authorName = `${comment.author.firstName} ${comment.author.lastName}`;

    // Candidate name + COMMENT_ADDED timeline in parallel
    const [candidate] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: params.candidateId },
        select: { firstName: true, lastName: true },
      }),
      prisma.timelineEvent.create({
        data: {
          candidateId: params.candidateId,
          applicationId: params.applicationId,
          actorId: params.authorId,
          type: 'COMMENT_ADDED',
          metadata: { commentId: comment.id },
        },
      }),
    ]);
    const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : 'a candidate';

    // Mention timeline + notifications in parallel
    if (validMentionUserIds.length > 0) {
      const notifyIds = validMentionUserIds.filter((uid) => uid !== params.authorId);
      await Promise.all([
        prisma.timelineEvent.create({
          data: {
            candidateId: params.candidateId,
            applicationId: params.applicationId,
            actorId: params.authorId,
            type: 'MENTION_CREATED',
            metadata: {
              commentId: comment.id,
              mentionedUserIds: validMentionUserIds,
            },
          },
        }),
        ...notifyIds.map((uid) =>
          notificationsService.push(uid, {
            type: 'application',
            title: 'You were mentioned',
            message: `${authorName} mentioned you in a comment on ${candidateName}`,
            href: `/candidates/${params.candidateId}`,
          }),
        ),
      ]);
    }

    return comment;
  },

  async getComments(
    candidateId: string,
    applicationId: string | undefined,
    page: number,
    pageSize: number,
  ) {
    return commentRepository.findByCandidate(candidateId, applicationId, page, pageSize);
  },

  async deleteComment(
    commentId: string,
    requestingUserId: string,
    requestingRole: string,
  ) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      const err = new Error('Comment not found');
      (err as Error & { code: string }).code = 'NOT_FOUND';
      throw err;
    }
    if (comment.deletedAt) {
      const err = new Error('Comment already deleted');
      (err as Error & { code: string }).code = 'ALREADY_DELETED';
      throw err;
    }

    // Only author, ADMIN, or HR can delete
    if (
      comment.authorId !== requestingUserId &&
      !['ADMIN', 'HR'].includes(requestingRole)
    ) {
      const err = new Error('You can only delete your own comments');
      (err as Error & { code: string }).code = 'FORBIDDEN';
      throw err;
    }

    await commentRepository.softDelete(commentId);
  },
};
