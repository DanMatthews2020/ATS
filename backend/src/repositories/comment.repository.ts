/**
 * @file comment.repository.ts
 * @description CandidateComment persistence — CRUD with soft-delete and mention support.
 */
import { prisma } from '../lib/prisma';

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

const INCLUDE = {
  author: { select: AUTHOR_SELECT },
  mentions: {
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  },
} as const;

export interface CommentCreateData {
  candidateId: string;
  applicationId?: string;
  authorId: string;
  body: string;
  mentions: { userId: string }[];
}

export const commentRepository = {
  /**
   * Paginated comments for a candidate. Soft-deleted comments return as
   * placeholders with body stripped out.
   */
  async findByCandidate(
    candidateId: string,
    applicationId: string | undefined,
    page: number,
    pageSize: number,
  ) {
    const where: Record<string, unknown> = {
      candidateId,
      candidate: { deletedAt: null },
    };
    if (applicationId) where.applicationId = applicationId;

    const [comments, total] = await Promise.all([
      prisma.candidateComment.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.candidateComment.count({ where }),
    ]);

    // Strip body from soft-deleted comments
    const mapped = comments.map((c) => {
      if (c.deletedAt) {
        return { id: c.id, deletedAt: c.deletedAt, body: null, createdAt: c.createdAt };
      }
      return c;
    });

    return { comments: mapped, total };
  },

  async findById(id: string) {
    return prisma.candidateComment.findUnique({
      where: { id },
      include: INCLUDE,
    });
  },

  async create(data: CommentCreateData) {
    return prisma.candidateComment.create({
      data: {
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        authorId: data.authorId,
        body: data.body,
        mentions: {
          create: data.mentions.map((m) => ({ userId: m.userId })),
        },
      },
      include: INCLUDE,
    });
  },

  async softDelete(commentId: string) {
    await prisma.candidateComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  },
};
