import 'dotenv/config';

// Seed uses the direct (session-mode) URL to avoid pgBouncer prepared-statement limits
const prismaOptions = process.env.DIRECT_URL
  ? { datasources: { db: { url: process.env.DIRECT_URL } } }
  : {};

import {
  PrismaClient,
  UserRole,
  JobStatus,
  JobType,
  ApplicationStatus,
  InterviewType,
  InterviewStatus,
  OfferStatus,
  CandidateSource,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient(prismaOptions);

async function main() {
  console.log('🌱  Seeding database…\n');

  // ── Wipe existing data (order matters for FK constraints) ─────────────────
  await prisma.offer.deleteMany();
  await prisma.interviewsOnUsers.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.onboardingTask.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Users (2) ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@teamtalent.com',
      passwordHash,
      role: UserRole.ADMIN,
      firstName: 'John',
      lastName: 'Doe',
    },
  });
  const hrManager = await prisma.user.create({
    data: {
      email: 'hr@teamtalent.com',
      passwordHash,
      role: UserRole.HR,
      firstName: 'Sarah',
      lastName: 'Williams',
    },
  });

  console.log('  ✓ Users created');

  // ── Job postings (8) ──────────────────────────────────────────────────────
  const jobData: Array<{
    title: string;
    department: string;
    location: string;
    type: JobType;
    status: JobStatus;
    description: string;
    openedAt?: Date;
  }> = [
    {
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: JobType.FULL_TIME,
      status: JobStatus.OPEN,
      description: 'Build world-class user interfaces with React and TypeScript.',
      openedAt: new Date('2026-01-10'),
    },
    {
      title: 'Backend Engineer (Node.js)',
      department: 'Engineering',
      location: 'San Francisco, CA',
      type: JobType.FULL_TIME,
      status: JobStatus.OPEN,
      description: 'Design and scale the APIs powering our platform.',
      openedAt: new Date('2026-01-15'),
    },
    {
      title: 'Product Manager — Growth',
      department: 'Product',
      location: 'New York, NY',
      type: JobType.FULL_TIME,
      status: JobStatus.OPEN,
      description: 'Drive growth initiatives across acquisition and activation.',
      openedAt: new Date('2026-02-01'),
    },
    {
      title: 'Senior Product Designer',
      department: 'Design',
      location: 'Remote',
      type: JobType.FULL_TIME,
      status: JobStatus.OPEN,
      description: 'Shape the visual language and UX of our core product.',
      openedAt: new Date('2026-02-10'),
    },
    {
      title: 'Data Analyst',
      department: 'Analytics',
      location: 'Austin, TX',
      type: JobType.FULL_TIME,
      status: JobStatus.OPEN,
      description: 'Turn complex datasets into actionable business intelligence.',
      openedAt: new Date('2026-02-20'),
    },
    {
      title: 'DevOps / Platform Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: JobType.CONTRACT,
      status: JobStatus.OPEN,
      description: 'Own infrastructure reliability, CI/CD, and cloud architecture.',
      openedAt: new Date('2026-03-01'),
    },
    {
      title: 'Customer Success Manager',
      department: 'Success',
      location: 'Chicago, IL',
      type: JobType.FULL_TIME,
      status: JobStatus.CLOSED,
      description: 'Manage relationships with enterprise customers post-onboarding.',
      openedAt: new Date('2025-11-01'),
    },
    {
      title: 'Marketing Manager',
      department: 'Marketing',
      location: 'Remote',
      type: JobType.FULL_TIME,
      status: JobStatus.DRAFT,
      description: 'Lead demand generation and content marketing strategy.',
    },
  ];

  const jobs = [];
  for (const d of jobData) {
    jobs.push(await prisma.jobPosting.create({ data: { ...d, createdById: admin.id } }));
  }

  console.log('  ✓ Job postings created');

  // ── Candidates (20) ───────────────────────────────────────────────────────
  const candidateData = [
    { firstName: 'Emma',    lastName: 'Johnson',   email: 'emma.johnson@example.com',   location: 'San Francisco, CA', skills: ['React', 'TypeScript', 'Node.js'],         source: CandidateSource.JOB_BOARD },
    { firstName: 'Marcus',  lastName: 'Chen',      email: 'marcus.chen@example.com',    location: 'Seattle, WA',       skills: ['Python', 'Go', 'PostgreSQL'],             source: CandidateSource.REFERRAL },
    { firstName: 'Aisha',   lastName: 'Thompson',  email: 'aisha.t@example.com',        location: 'New York, NY',      skills: ['Figma', 'User Research', 'Prototyping'],  source: CandidateSource.DIRECT },
    { firstName: 'Jordan',  lastName: 'Lee',       email: 'jordan.lee@example.com',     location: 'Austin, TX',        skills: ['React', 'Next.js', 'GraphQL'],            source: CandidateSource.AI_SOURCED },
    { firstName: 'Priya',   lastName: 'Patel',     email: 'priya.patel@example.com',    location: 'Palo Alto, CA',     skills: ['Product Strategy', 'SQL', 'OKRs'],        source: CandidateSource.JOB_BOARD },
    { firstName: 'Carlos',  lastName: 'Rivera',    email: 'carlos.r@example.com',       location: 'Miami, FL',         skills: ['Python', 'R', 'Tableau'],                 source: CandidateSource.JOB_BOARD },
    { firstName: 'Mia',     lastName: 'Tanaka',    email: 'mia.tanaka@example.com',     location: 'Remote',            skills: ['Next.js', 'Rust', 'Performance'],         source: CandidateSource.AI_SOURCED },
    { firstName: 'Ethan',   lastName: 'Brooks',    email: 'ethan.b@example.com',        location: 'New York, NY',      skills: ['React', 'Node.js', 'APIs'],               source: CandidateSource.REFERRAL },
    { firstName: 'Aria',    lastName: 'Ndiaye',    email: 'aria.n@example.com',         location: 'Toronto, Canada',   skills: ['Vue.js', 'TypeScript', 'CSS'],            source: CandidateSource.JOB_BOARD },
    { firstName: 'Omar',    lastName: 'Hassan',    email: 'omar.h@example.com',         location: 'London, UK',        skills: ['Docker', 'Kubernetes', 'AWS'],            source: CandidateSource.DIRECT },
    { firstName: 'Nina',    lastName: 'Rodriguez', email: 'nina.r@example.com',         location: 'Austin, TX',        skills: ['Product Management', 'Agile', 'Jira'],    source: CandidateSource.JOB_BOARD },
    { firstName: 'David',   lastName: 'Park',      email: 'david.p@example.com',        location: 'Chicago, IL',       skills: ['Java', 'Spring Boot', 'Microservices'],   source: CandidateSource.AGENCY },
    { firstName: 'Sofia',   lastName: 'Rossi',     email: 'sofia.rossi@example.com',    location: 'Remote',            skills: ['UX Writing', 'Figma', 'A/B Testing'],     source: CandidateSource.DIRECT },
    { firstName: 'James',   lastName: 'Wilson',    email: 'james.w@example.com',        location: 'Boston, MA',        skills: ['Terraform', 'GCP', 'CI/CD'],              source: CandidateSource.JOB_BOARD },
    { firstName: 'Lena',    lastName: 'Fischer',   email: 'lena.f@example.com',         location: 'Berlin, Germany',   skills: ['SQL', 'dbt', 'Looker', 'Python'],         source: CandidateSource.AI_SOURCED },
    { firstName: 'Alex',    lastName: 'Martinez',  email: 'alex.martinez@example.com',  location: 'Los Angeles, CA',   skills: ['Brand Design', 'Figma', 'Illustration'],  source: CandidateSource.REFERRAL },
    { firstName: 'Yuki',    lastName: 'Tanaka',    email: 'yuki.t@example.com',         location: 'Tokyo, Japan',      skills: ['Rails', 'PostgreSQL', 'Redis'],           source: CandidateSource.JOB_BOARD },
    { firstName: 'Rachel',  lastName: 'Kim',       email: 'rachel.kim@example.com',     location: 'San Francisco, CA', skills: ['iOS', 'Swift', 'SwiftUI'],                source: CandidateSource.DIRECT },
    { firstName: 'Patrick', lastName: 'O\'Brien',  email: 'patrick.ob@example.com',     location: 'Dublin, Ireland',   skills: ['Customer Success', 'Salesforce', 'SaaS'], source: CandidateSource.JOB_BOARD },
    { firstName: 'Zara',    lastName: 'Ahmed',     email: 'zara.a@example.com',         location: 'Dubai, UAE',        skills: ['Marketing', 'SEO', 'Content Strategy'],   source: CandidateSource.AI_SOURCED },
  ];

  const candidates = [];
  for (const d of candidateData) {
    candidates.push(await prisma.candidate.create({ data: d }));
  }

  console.log('  ✓ Candidates created');

  // ── Applications (30) ─────────────────────────────────────────────────────
  const applicationSpecs: Array<{
    candidateIdx: number;
    jobIdx: number;
    status: ApplicationStatus;
    appliedAt: Date;
  }> = [
    { candidateIdx: 0,  jobIdx: 0, status: ApplicationStatus.INTERVIEW,  appliedAt: new Date('2026-01-18') },
    { candidateIdx: 1,  jobIdx: 1, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-01-20') },
    { candidateIdx: 2,  jobIdx: 3, status: ApplicationStatus.OFFER,      appliedAt: new Date('2026-02-12') },
    { candidateIdx: 3,  jobIdx: 0, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-02-25') },
    { candidateIdx: 4,  jobIdx: 2, status: ApplicationStatus.INTERVIEW,  appliedAt: new Date('2026-02-05') },
    { candidateIdx: 5,  jobIdx: 4, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-02-22') },
    { candidateIdx: 6,  jobIdx: 0, status: ApplicationStatus.HIRED,      appliedAt: new Date('2025-12-10') },
    { candidateIdx: 7,  jobIdx: 1, status: ApplicationStatus.INTERVIEW,  appliedAt: new Date('2026-01-28') },
    { candidateIdx: 8,  jobIdx: 0, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-01') },
    { candidateIdx: 9,  jobIdx: 5, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-03-05') },
    { candidateIdx: 10, jobIdx: 2, status: ApplicationStatus.REJECTED,   appliedAt: new Date('2026-02-08') },
    { candidateIdx: 11, jobIdx: 1, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-10') },
    { candidateIdx: 12, jobIdx: 3, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-02-14') },
    { candidateIdx: 13, jobIdx: 5, status: ApplicationStatus.INTERVIEW,  appliedAt: new Date('2026-03-08') },
    { candidateIdx: 14, jobIdx: 4, status: ApplicationStatus.HIRED,      appliedAt: new Date('2025-11-20') },
    { candidateIdx: 15, jobIdx: 7, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-12') },
    { candidateIdx: 16, jobIdx: 1, status: ApplicationStatus.REJECTED,   appliedAt: new Date('2026-01-25') },
    { candidateIdx: 17, jobIdx: 0, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-03-15') },
    { candidateIdx: 18, jobIdx: 6, status: ApplicationStatus.HIRED,      appliedAt: new Date('2025-11-05') },
    { candidateIdx: 19, jobIdx: 7, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-18') },
    { candidateIdx: 0,  jobIdx: 3, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-05') },
    { candidateIdx: 1,  jobIdx: 5, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-03-08') },
    { candidateIdx: 2,  jobIdx: 0, status: ApplicationStatus.REJECTED,   appliedAt: new Date('2026-01-30') },
    { candidateIdx: 4,  jobIdx: 4, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-11') },
    { candidateIdx: 5,  jobIdx: 2, status: ApplicationStatus.OFFER,      appliedAt: new Date('2026-02-01') },
    { candidateIdx: 7,  jobIdx: 4, status: ApplicationStatus.INTERVIEW,  appliedAt: new Date('2026-02-28') },
    { candidateIdx: 8,  jobIdx: 2, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-14') },
    { candidateIdx: 9,  jobIdx: 1, status: ApplicationStatus.APPLIED,    appliedAt: new Date('2026-03-16') },
    { candidateIdx: 11, jobIdx: 5, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-03-10') },
    { candidateIdx: 13, jobIdx: 2, status: ApplicationStatus.SCREENING,  appliedAt: new Date('2026-02-18') },
  ];

  const applications = [];
  for (const s of applicationSpecs) {
    applications.push(await prisma.application.create({
      data: {
        candidateId:  candidates[s.candidateIdx].id,
        jobPostingId: jobs[s.jobIdx].id,
        status:       s.status,
        appliedAt:    s.appliedAt,
      },
    }));
  }

  console.log('  ✓ Applications created');

  // ── Interviews (10) ───────────────────────────────────────────────────────
  // Pick applications that are in INTERVIEW or OFFER stage
  const interviewableStatuses: ApplicationStatus[] = [ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER, ApplicationStatus.HIRED];
  const interviewableApps = applications.filter((a) => interviewableStatuses.includes(a.status));

  const interviewData: Array<{
    appIdx: number;
    scheduledAt: Date;
    type: InterviewType;
    status: InterviewStatus;
    duration: number;
  }> = [
    { appIdx: 0, scheduledAt: new Date('2026-02-01T10:00:00Z'), type: InterviewType.VIDEO,     status: InterviewStatus.COMPLETED,  duration: 60 },
    { appIdx: 0, scheduledAt: new Date('2026-02-10T14:00:00Z'), type: InterviewType.TECHNICAL,  status: InterviewStatus.SCHEDULED,  duration: 90 },
    { appIdx: 1, scheduledAt: new Date('2026-03-20T09:00:00Z'), type: InterviewType.PHONE,      status: InterviewStatus.SCHEDULED,  duration: 30 },
    { appIdx: 2, scheduledAt: new Date('2026-02-20T11:00:00Z'), type: InterviewType.VIDEO,      status: InterviewStatus.COMPLETED,  duration: 60 },
    { appIdx: 3, scheduledAt: new Date('2026-02-15T15:30:00Z'), type: InterviewType.VIDEO,      status: InterviewStatus.COMPLETED,  duration: 45 },
    { appIdx: 4, scheduledAt: new Date('2026-03-18T10:00:00Z'), type: InterviewType.ON_SITE,    status: InterviewStatus.SCHEDULED,  duration: 120 },
    { appIdx: 5, scheduledAt: new Date('2026-03-21T13:00:00Z'), type: InterviewType.PHONE,      status: InterviewStatus.SCHEDULED,  duration: 30 },
    { appIdx: 6, scheduledAt: new Date('2026-03-22T11:00:00Z'), type: InterviewType.VIDEO,      status: InterviewStatus.SCHEDULED,  duration: 60 },
    { appIdx: 7, scheduledAt: new Date('2026-01-20T09:00:00Z'), type: InterviewType.PHONE,      status: InterviewStatus.COMPLETED,  duration: 30 },
    { appIdx: 8, scheduledAt: new Date('2026-03-25T14:00:00Z'), type: InterviewType.TECHNICAL,  status: InterviewStatus.SCHEDULED,  duration: 90 },
  ];

  for (let i = 0; i < interviewData.length; i++) {
    const d = interviewData[i];
    await prisma.interview.create({
      data: {
        applicationId: interviewableApps[Math.min(d.appIdx, interviewableApps.length - 1)].id,
        scheduledAt:   d.scheduledAt,
        type:          d.type,
        status:        d.status,
        duration:      d.duration,
        interviewers: {
          create: [{ userId: i % 2 === 0 ? admin.id : hrManager.id }],
        },
      },
    });
  }

  console.log('  ✓ Interviews created');

  // ── Offers (5) ────────────────────────────────────────────────────────────
  const offerStatuses: ApplicationStatus[] = [ApplicationStatus.OFFER, ApplicationStatus.HIRED];
  const offerApps = applications.filter((a) => offerStatuses.includes(a.status));

  const offerSpecs: Array<{
    appIdx: number;
    salary: number;
    status: OfferStatus;
    sentAt: Date;
    expiresAt: Date;
    acceptedAt?: Date;
  }> = [
    {
      appIdx: 0,
      salary: 135000,
      status: OfferStatus.ACCEPTED,
      sentAt: new Date('2026-02-25'),
      expiresAt: new Date('2026-03-07'),
      acceptedAt: new Date('2026-03-02'),
    },
    {
      appIdx: 1,
      salary: 110000,
      status: OfferStatus.SENT,
      sentAt: new Date('2026-03-10'),
      expiresAt: new Date('2026-03-24'),
    },
    {
      appIdx: 2,
      salary: 95000,
      status: OfferStatus.SENT,
      sentAt: new Date('2026-03-12'),
      expiresAt: new Date('2026-03-26'),
    },
    {
      appIdx: 3,
      salary: 88000,
      status: OfferStatus.REJECTED,
      sentAt: new Date('2026-02-10'),
      expiresAt: new Date('2026-02-20'),
    },
    {
      appIdx: Math.min(4, offerApps.length - 1),
      salary: 145000,
      status: OfferStatus.ACCEPTED,
      sentAt: new Date('2025-12-01'),
      expiresAt: new Date('2025-12-15'),
      acceptedAt: new Date('2025-12-08'),
    },
  ];

  for (const s of offerSpecs) {
    await prisma.offer.create({
      data: {
        applicationId: offerApps[Math.min(s.appIdx, offerApps.length - 1)].id,
        salary: s.salary,
        currency: 'USD',
        status: s.status,
        sentAt: s.sentAt,
        expiresAt: s.expiresAt,
        acceptedAt: s.acceptedAt,
      },
    });
  }

  console.log('  ✓ Offers created');
  console.log('\n✅  Seed complete!\n');
  console.log('   Login credentials:');
  console.log('   admin@teamtalent.com  /  Admin123!  (ADMIN)');
  console.log('   hr@teamtalent.com     /  Admin123!  (HR)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
