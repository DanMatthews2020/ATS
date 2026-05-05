/**
 * @file managerDashboard.service.ts
 * @description Dashboard data scoped to a MANAGER's assigned jobs via JobMember.
 */
import { prisma } from '../lib/prisma';

export interface ManagerDashboardDto {
  myJobs: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    status: string;
    applicantCount: number;
  }[];
  pendingFeedback: {
    interviewId: string;
    candidateName: string;
    jobTitle: string;
    scheduledAt: string;
    type: string;
  }[];
  upcomingInterviews: {
    id: string;
    candidateName: string;
    jobTitle: string;
    scheduledAt: string;
    duration: number;
    type: string;
    meetingLink: string | null;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }[];
  stats: {
    totalJobs: number;
    totalCandidates: number;
    pendingFeedbackCount: number;
    upcomingInterviewCount: number;
  };
}

export const managerDashboardService = {
  async getManagerDashboard(userId: string): Promise<ManagerDashboardDto> {
    // Get all jobs this user is a member of
    const memberships = await prisma.jobMember.findMany({
      where: { userId },
      select: { jobId: true },
    });

    const jobIds = memberships.map((m) => m.jobId);

    if (jobIds.length === 0) {
      return {
        myJobs: [],
        pendingFeedback: [],
        upcomingInterviews: [],
        recentActivity: [],
        stats: { totalJobs: 0, totalCandidates: 0, pendingFeedbackCount: 0, upcomingInterviewCount: 0 },
      };
    }

    // Run all queries in parallel since they only depend on jobIds
    const now = new Date();
    const [jobs, pendingRequests, upcomingRows, recentEvents, candidateCount] = await Promise.all([
      prisma.jobPosting.findMany({
        where: { id: { in: jobIds } },
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedbackRequest.findMany({
        where: {
          userId,
          status: 'PENDING',
          interview: { application: { jobPostingId: { in: jobIds } } },
        },
        include: {
          interview: {
            include: {
              application: {
                include: {
                  candidate: { select: { firstName: true, lastName: true } },
                  jobPosting: { select: { title: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.interview.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: now },
          application: { jobPostingId: { in: jobIds } },
        },
        include: {
          application: {
            include: {
              candidate: { select: { firstName: true, lastName: true } },
              jobPosting: { select: { title: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),
      prisma.timelineEvent.findMany({
        where: { application: { jobPostingId: { in: jobIds } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.application.count({
        where: { jobPostingId: { in: jobIds }, candidate: { deletedAt: null } },
      }),
    ]);

    const myJobs = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      department: j.department,
      location: j.location,
      status: j.status,
      applicantCount: j._count.applications,
    }));

    const pendingFeedback = pendingRequests.map((fr) => ({
      interviewId: fr.interviewId,
      candidateName: `${fr.interview.application.candidate.firstName} ${fr.interview.application.candidate.lastName}`,
      jobTitle: fr.interview.application.jobPosting.title,
      scheduledAt: fr.interview.scheduledAt.toISOString(),
      type: fr.interview.type,
    }));

    const upcomingInterviews = upcomingRows.map((iv) => ({
      id: iv.id,
      candidateName: `${iv.application.candidate.firstName} ${iv.application.candidate.lastName}`,
      jobTitle: iv.application.jobPosting.title,
      scheduledAt: iv.scheduledAt.toISOString(),
      duration: iv.duration,
      type: iv.type,
      meetingLink: iv.meetingLink,
    }));

    const recentActivity = recentEvents.map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    }));

    return {
      myJobs,
      pendingFeedback,
      upcomingInterviews,
      recentActivity,
      stats: {
        totalJobs: myJobs.length,
        totalCandidates: candidateCount,
        pendingFeedbackCount: pendingFeedback.length,
        upcomingInterviewCount: upcomingInterviews.length,
      },
    };
  },
};
