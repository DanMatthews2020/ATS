import { randomUUID } from 'crypto';

export type InterviewType   = 'Phone' | 'Video' | 'On-site' | 'Technical';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';
export type Recommendation  = 'hire' | 'no-hire' | 'maybe';

export interface Interviewer { id: string; name: string; role: string }

export interface FeedbackEntry {
  rating:         number; // 1–5
  recommendation: Recommendation;
  notes:          string;
  submittedAt:    string;
}

export interface Interview {
  id:            string;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  interviewers:  Interviewer[];
  type:          InterviewType;
  status:        InterviewStatus;
  scheduledAt:   string; // ISO
  duration:      number; // minutes
  meetingLink:   string | null;
  location:      string | null;
  feedback:      FeedbackEntry | null;
  notes:         string;
  createdAt:     string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function d(offsetDays: number, hour: number, min = 0): string {
  const dt = new Date('2026-03-24T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  dt.setUTCHours(hour, min, 0, 0);
  return dt.toISOString();
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const INTERVIEWERS = {
  alex:   { id: 'tm-1', name: 'Alex Johnson',    role: 'HR Lead'           },
  sarah:  { id: 'tm-2', name: 'Sarah Chen',       role: 'Recruiter'         },
  marcus: { id: 'tm-3', name: 'Marcus Williams',  role: 'Engineering Lead'  },
  priya:  { id: 'tm-4', name: 'Priya Patel',      role: 'Product Lead'      },
  james:  { id: 'tm-5', name: 'James Okafor',     role: 'Recruiter'         },
};

const interviews = new Map<string, Interview>([
  ['iv-1', {
    id: 'iv-1', candidateId: 'c-1', candidateName: 'Emily Carter',
    jobId: 'j-1', jobTitle: 'Senior Frontend Engineer',
    interviewers: [INTERVIEWERS.marcus, INTERVIEWERS.alex],
    type: 'Technical', status: 'scheduled',
    scheduledAt: d(1, 10, 0), duration: 60,
    meetingLink: 'https://meet.google.com/abc-defg-hij', location: null,
    feedback: null, notes: '', createdAt: d(-7, 9),
  }],
  ['iv-2', {
    id: 'iv-2', candidateId: 'c-2', candidateName: 'Liam Nguyen',
    jobId: 'j-2', jobTitle: 'Product Manager',
    interviewers: [INTERVIEWERS.priya, INTERVIEWERS.sarah],
    type: 'Video', status: 'scheduled',
    scheduledAt: d(1, 14, 0), duration: 45,
    meetingLink: 'https://zoom.us/j/123456789', location: null,
    feedback: null, notes: '', createdAt: d(-5, 10),
  }],
  ['iv-3', {
    id: 'iv-3', candidateId: 'c-3', candidateName: 'Sophia Okonkwo',
    jobId: 'j-3', jobTitle: 'Data Analyst',
    interviewers: [INTERVIEWERS.sarah],
    type: 'Phone', status: 'completed',
    scheduledAt: d(-2, 11, 0), duration: 30,
    meetingLink: null, location: null,
    feedback: {
      rating: 4, recommendation: 'hire',
      notes: 'Strong analytical skills, clear communicator. Would be a great fit.',
      submittedAt: d(-2, 11, 40),
    },
    notes: 'Discussed SQL proficiency and prior analytics projects.', createdAt: d(-9, 8),
  }],
  ['iv-4', {
    id: 'iv-4', candidateId: 'c-4', candidateName: 'Tom Bradley',
    jobId: 'j-1', jobTitle: 'Senior Frontend Engineer',
    interviewers: [INTERVIEWERS.marcus],
    type: 'Technical', status: 'completed',
    scheduledAt: d(-3, 15, 0), duration: 90,
    meetingLink: 'https://meet.google.com/xyz-abcd-efg', location: null,
    feedback: {
      rating: 2, recommendation: 'no-hire',
      notes: 'Struggled with algorithmic challenges. React fundamentals were weak.',
      submittedAt: d(-3, 16, 40),
    },
    notes: '', createdAt: d(-10, 9),
  }],
  ['iv-5', {
    id: 'iv-5', candidateId: 'c-5', candidateName: 'Aisha Kamara',
    jobId: 'j-4', jobTitle: 'UX Designer',
    interviewers: [INTERVIEWERS.priya, INTERVIEWERS.alex],
    type: 'On-site', status: 'completed',
    scheduledAt: d(-1, 9, 30), duration: 60,
    meetingLink: null, location: '12 Finsbury Sq, London, EC2A 1AR',
    feedback: {
      rating: 5, recommendation: 'hire',
      notes: 'Exceptional portfolio. Strong system thinking and presentation. Top candidate.',
      submittedAt: d(-1, 10, 45),
    },
    notes: 'Portfolio review + whiteboard exercise.', createdAt: d(-6, 11),
  }],
  ['iv-6', {
    id: 'iv-6', candidateId: 'c-6', candidateName: 'Ryan Park',
    jobId: 'j-2', jobTitle: 'Product Manager',
    interviewers: [INTERVIEWERS.priya],
    type: 'Phone', status: 'cancelled',
    scheduledAt: d(-1, 13, 0), duration: 30,
    meetingLink: null, location: null,
    feedback: null, notes: 'Candidate requested reschedule, then withdrew.', createdAt: d(-8, 14),
  }],
  ['iv-7', {
    id: 'iv-7', candidateId: 'c-7', candidateName: 'Mei Lin',
    jobId: 'j-5', jobTitle: 'Backend Engineer',
    interviewers: [INTERVIEWERS.marcus, INTERVIEWERS.james],
    type: 'Technical', status: 'scheduled',
    scheduledAt: d(2, 10, 30), duration: 90,
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/abc', location: null,
    feedback: null, notes: '', createdAt: d(-4, 10),
  }],
  ['iv-8', {
    id: 'iv-8', candidateId: 'c-8', candidateName: 'Daniel Osei',
    jobId: 'j-3', jobTitle: 'Data Analyst',
    interviewers: [INTERVIEWERS.sarah, INTERVIEWERS.alex],
    type: 'Video', status: 'scheduled',
    scheduledAt: d(2, 15, 0), duration: 45,
    meetingLink: 'https://zoom.us/j/987654321', location: null,
    feedback: null, notes: '', createdAt: d(-3, 15),
  }],
  ['iv-9', {
    id: 'iv-9', candidateId: 'c-9', candidateName: 'Clara Müller',
    jobId: 'j-4', jobTitle: 'UX Designer',
    interviewers: [INTERVIEWERS.priya],
    type: 'Video', status: 'scheduled',
    scheduledAt: d(3, 11, 0), duration: 60,
    meetingLink: 'https://meet.google.com/pqr-stuv-wxy', location: null,
    feedback: null, notes: '', createdAt: d(-2, 13),
  }],
  ['iv-10', {
    id: 'iv-10', candidateId: 'c-10', candidateName: 'Isaac Fernandez',
    jobId: 'j-5', jobTitle: 'Backend Engineer',
    interviewers: [INTERVIEWERS.marcus],
    type: 'On-site', status: 'scheduled',
    scheduledAt: d(4, 9, 0), duration: 120,
    meetingLink: null, location: '12 Finsbury Sq, London, EC2A 1AR',
    feedback: null, notes: 'Final round — bring all interviewers.', createdAt: d(-1, 9),
  }],
  ['iv-11', {
    id: 'iv-11', candidateId: 'c-3', candidateName: 'Sophia Okonkwo',
    jobId: 'j-3', jobTitle: 'Data Analyst',
    interviewers: [INTERVIEWERS.alex, INTERVIEWERS.priya],
    type: 'Video', status: 'scheduled',
    scheduledAt: d(5, 14, 0), duration: 60,
    meetingLink: 'https://zoom.us/j/555666777', location: null,
    feedback: null, notes: 'Second round after positive phone screen.', createdAt: d(-2, 14),
  }],
  ['iv-12', {
    id: 'iv-12', candidateId: 'c-11', candidateName: 'Nadia Svensson',
    jobId: 'j-1', jobTitle: 'Senior Frontend Engineer',
    interviewers: [INTERVIEWERS.marcus, INTERVIEWERS.sarah],
    type: 'Technical', status: 'no-show',
    scheduledAt: d(-4, 14, 0), duration: 60,
    meetingLink: 'https://meet.google.com/noshowtest', location: null,
    feedback: null, notes: 'Did not attend. No prior notice.', createdAt: d(-11, 10),
  }],
]);

// ── Service ───────────────────────────────────────────────────────────────────

export const interviewsService = {
  getAll(from?: string, to?: string): Interview[] {
    let list = Array.from(interviews.values());
    if (from) list = list.filter((i) => i.scheduledAt >= from);
    if (to)   list = list.filter((i) => i.scheduledAt <= to);
    return list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  },

  getById(id: string): Interview | null {
    return interviews.get(id) ?? null;
  },

  create(data: {
    candidateId: string; candidateName: string;
    jobId: string; jobTitle: string;
    interviewers: Interviewer[];
    type: InterviewType; scheduledAt: string; duration: number;
    meetingLink?: string; location?: string; notes?: string;
  }): Interview {
    const id = `iv-${randomUUID().slice(0, 8)}`;
    const interview: Interview = {
      id,
      candidateId:   data.candidateId,
      candidateName: data.candidateName,
      jobId:         data.jobId,
      jobTitle:      data.jobTitle,
      interviewers:  data.interviewers,
      type:          data.type,
      status:        'scheduled',
      scheduledAt:   data.scheduledAt,
      duration:      data.duration,
      meetingLink:   data.meetingLink ?? null,
      location:      data.location ?? null,
      feedback:      null,
      notes:         data.notes ?? '',
      createdAt:     new Date().toISOString(),
    };
    interviews.set(id, interview);
    return interview;
  },

  update(id: string, patch: Partial<Pick<Interview, 'scheduledAt' | 'duration' | 'meetingLink' | 'location' | 'status' | 'notes' | 'interviewers' | 'type'>>): Interview | null {
    const iv = interviews.get(id);
    if (!iv) return null;
    Object.assign(iv, patch);
    return iv;
  },

  submitFeedback(id: string, feedback: Omit<FeedbackEntry, 'submittedAt'>): Interview | null {
    const iv = interviews.get(id);
    if (!iv) return null;
    iv.feedback = { ...feedback, submittedAt: new Date().toISOString() };
    if (iv.status === 'scheduled') iv.status = 'completed';
    return iv;
  },

  cancel(id: string): Interview | null {
    const iv = interviews.get(id);
    if (!iv) return null;
    iv.status = 'cancelled';
    return iv;
  },

  getUpcomingCount(): number {
    const now = new Date().toISOString();
    return Array.from(interviews.values()).filter(
      (i) => i.status === 'scheduled' && i.scheduledAt >= now,
    ).length;
  },
};
