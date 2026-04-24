/**
 * @file feed.service.ts
 * @description Public job feed service — no auth required.
 *
 * Returns open job postings formatted for external consumption
 * (career pages, job boards, embed widgets).
 */
import { prisma } from '../lib/prisma';

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
};

export interface FeedJobDto {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  apply_url: string;
  posted_at: string;
}

export interface JobFeedResponse {
  feed_generated_at: string;
  total_jobs: number;
  jobs: FeedJobDto[];
}

export const feedService = {
  async getOpenJobs(): Promise<JobFeedResponse> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    const jobs = await prisma.jobPosting.findMany({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        type: true,
        description: true,
        openedAt: true,
        createdAt: true,
      },
    });

    return {
      feed_generated_at: new Date().toISOString(),
      total_jobs: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        type: JOB_TYPE_LABELS[job.type] ?? job.type,
        description: job.description,
        apply_url: `${frontendUrl}/jobs/${job.id}/apply`,
        posted_at: (job.openedAt ?? job.createdAt).toISOString(),
      })),
    };
  },

  async getOpenJobById(jobId: string) {
    return prisma.jobPosting.findFirst({
      where: { id: jobId, status: 'OPEN' },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        type: true,
        description: true,
        requirements: true,
        openedAt: true,
        createdAt: true,
      },
    });
  },
};
