/**
 * @file dashboard.repository.ts
 * @description Database queries for the main dashboard KPI stats.
 *
 * Runs four count queries in parallel to minimise latency — each
 * count targets a different model/status combination.
 */
import { prisma } from '../lib/prisma';

export const dashboardRepository = {
  async getStats() {
    const [openPositions, activeCandidates, interviewsScheduled, offersSent] =
      await Promise.all([
        prisma.jobPosting.count({ where: { status: 'OPEN' } }),
        prisma.application.count({
          where: { status: { notIn: ['HIRED', 'REJECTED'] } },
        }),
        prisma.interview.count({ where: { status: 'SCHEDULED' } }),
        prisma.offer.count({ where: { status: 'SENT' } }),
      ]);

    return { openPositions, activeCandidates, interviewsScheduled, offersSent };
  },
};
