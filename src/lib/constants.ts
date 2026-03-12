import type {
  NavItem,
  Job,
  Candidate,
  PipelineCandidate,
  User,
  StatCard,
  SelectOption,
  ApplicationStatusEntry,
  CriteriaWeight,
  ParsedSearchCriteria,
  SearchFilterChip,
  SearchResultPerson,
  CandidateProfileData,
} from '@/types';

// ─── Navigation ──────────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Sourcing',
    href: '/sourcing',
    icon: 'Search',
    children: [
      { label: 'People Search', href: '/sourcing/people' },
      { label: 'AI Sourcing Agent', href: '/sourcing/ai-agent' },
      { label: 'Unified Search', href: '/sourcing/unified' },
    ],
  },
  {
    label: 'Candidates',
    href: '/candidates',
    icon: 'Users',
  },
  {
    label: 'Pipeline',
    href: '/pipeline',
    icon: 'Layers',
  },
  {
    label: 'Job Postings',
    href: '/job-postings',
    icon: 'Briefcase',
  },
  {
    label: 'Talent Insights',
    href: '/talent-insights',
    icon: 'BarChart2',
  },
  {
    label: 'Onboarding',
    href: '/onboarding',
    icon: 'ClipboardList',
  },
  {
    label: 'Performance',
    href: '/performance',
    icon: 'Star',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: 'FileText',
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  label: 'Settings',
  href: '/settings',
  icon: 'Settings',
};

// ─── Mock User ────────────────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@teamtalent.com',
  avatarUrl: '',
  role: 'HR Manager',
};

// ─── Mock Jobs ────────────────────────────────────────────────────────────────

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Frontend Developer',
    description: 'Create stunning user interfaces and compelling web experiences that delight our customers.',
    department: 'Engineering',
    location: 'Remote',
    type: 'full-time',
    status: 'open',
    postedAt: '2024-01-15',
    applicantCount: 24,
  },
  {
    id: '2',
    title: 'Backend Developer',
    description: 'Develop robust backend solutions and scalable API architecture powering our platform.',
    department: 'Engineering',
    location: 'New York, NY',
    type: 'full-time',
    status: 'open',
    postedAt: '2024-01-12',
    applicantCount: 18,
  },
  {
    id: '3',
    title: 'Product Manager',
    description: 'Lead product development and drive the strategic roadmap across multiple teams.',
    department: 'Product',
    location: 'San Francisco, CA',
    type: 'full-time',
    status: 'open',
    postedAt: '2024-01-10',
    applicantCount: 31,
  },
  {
    id: '4',
    title: 'Senior Product Engineer',
    description: 'Build and scale our core platform with a sharp focus on reliability and performance.',
    department: 'Engineering',
    location: 'Remote',
    type: 'full-time',
    status: 'open',
    postedAt: '2024-01-08',
    applicantCount: 42,
  },
  {
    id: '5',
    title: 'UX Designer',
    description: 'Shape the user experience across our entire product suite from research to delivery.',
    department: 'Design',
    location: 'Austin, TX',
    type: 'full-time',
    status: 'open',
    postedAt: '2024-01-05',
    applicantCount: 15,
  },
  {
    id: '6',
    title: 'Data Analyst',
    description: 'Turn complex datasets into actionable business intelligence that drives growth decisions.',
    department: 'Analytics',
    location: 'Remote',
    type: 'contract',
    status: 'open',
    postedAt: '2024-01-03',
    applicantCount: 9,
  },
];

// ─── Mock Candidates ──────────────────────────────────────────────────────────

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Frontend Developer',
    avatarUrl: '',
    status: 'interview',
    appliedAt: '2024-01-16',
    jobId: '1',
  },
  {
    id: '2',
    name: 'Michael Lee',
    role: 'Backend Developer',
    avatarUrl: '',
    status: 'screening',
    appliedAt: '2024-01-14',
    jobId: '2',
  },
  {
    id: '3',
    name: 'Emily Davis',
    role: 'Product Manager',
    avatarUrl: '',
    status: 'offer',
    appliedAt: '2024-01-11',
    jobId: '3',
  },
  {
    id: '4',
    name: 'James Wilson',
    role: 'Frontend Developer',
    avatarUrl: '',
    status: 'new',
    appliedAt: '2024-01-17',
    jobId: '1',
  },
  {
    id: '5',
    name: 'Priya Patel',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    status: 'interview',
    appliedAt: '2024-01-09',
    jobId: '4',
  },
  {
    id: '6',
    name: 'Carlos Rivera',
    role: 'Data Analyst',
    avatarUrl: '',
    status: 'hired',
    appliedAt: '2024-01-04',
    jobId: '6',
  },
];

// ─── Mock Pipeline Candidates ─────────────────────────────────────────────────

export const MOCK_PIPELINE_CANDIDATES: PipelineCandidate[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'interview',
    score: 88,
    tags: ['React', 'TypeScript', 'Node.js'],
    appliedAt: '2024-01-09',
    jobId: '4',
  },
  {
    id: '2',
    name: 'Marcus Chen',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'screening',
    score: 74,
    tags: ['Python', 'Go', 'PostgreSQL'],
    appliedAt: '2024-01-10',
    jobId: '4',
  },
  {
    id: '3',
    name: 'Aisha Thompson',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'technical',
    score: 92,
    tags: ['Rust', 'Systems', 'Distributed'],
    appliedAt: '2024-01-08',
    jobId: '4',
  },
  {
    id: '4',
    name: 'David Park',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'applied',
    score: 61,
    tags: ['Java', 'Spring', 'AWS'],
    appliedAt: '2024-01-11',
    jobId: '4',
  },
  {
    id: '5',
    name: 'Nina Rodriguez',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'offer',
    score: 95,
    tags: ['TypeScript', 'React', 'GraphQL'],
    appliedAt: '2024-01-07',
    jobId: '4',
  },
  {
    id: '6',
    name: 'Omar Hassan',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'screening',
    score: 69,
    tags: ['Vue.js', 'Laravel', 'MySQL'],
    appliedAt: '2024-01-12',
    jobId: '4',
  },
  {
    id: '7',
    name: 'Priya Patel',
    role: 'Senior Product Engineer',
    avatarUrl: '',
    stage: 'interview',
    score: 81,
    tags: ['Next.js', 'AWS', 'Docker'],
    appliedAt: '2024-01-06',
    jobId: '4',
  },
  {
    id: '8',
    name: 'Lena Fischer',
    role: 'Frontend Developer',
    avatarUrl: '',
    stage: 'applied',
    score: 58,
    tags: ['HTML', 'CSS', 'JavaScript'],
    appliedAt: '2024-01-13',
    jobId: '1',
  },
];

// ─── Pipeline Job Options ─────────────────────────────────────────────────────

export const PIPELINE_JOB_OPTIONS: SelectOption[] = MOCK_JOBS.map((job) => ({
  value: job.id,
  label: job.title,
}));

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const DASHBOARD_STATS: StatCard[] = [
  { label: 'Open Positions', value: '24', change: '+3 this week', positive: true },
  { label: 'Active Candidates', value: '142', change: '+18 this month', positive: true },
  { label: 'Interviews Scheduled', value: '9', change: '+2 today', positive: true },
  { label: 'Offers Sent', value: '3', change: '−1 from last week', positive: false },
];

// ─── Login Feature List ───────────────────────────────────────────────────────

export const LOGIN_FEATURES: string[] = [
  'AI-powered candidate sourcing',
  'Automated pipeline management',
  'Real-time talent insights',
  'Collaborative hiring workflows',
];

// ─── Job Postings — Application Status ───────────────────────────────────────

export const MOCK_APPLICATION_STATUSES: ApplicationStatusEntry[] = [
  {
    id: '1',
    jobTitle: 'Software Engineer',
    appliedAgo: 'Applied 2 days ago',
    candidateName: 'Alex Martinez',
    candidateId: 'alex-martinez',
  },
  {
    id: '2',
    jobTitle: 'Product Designer',
    appliedAgo: 'Applied 5 days ago',
    candidateName: 'Sofia Patel',
    candidateId: 'sofia-patel',
  },
  {
    id: '3',
    jobTitle: 'Data Analyst',
    appliedAgo: 'Applied 1 week ago',
    candidateName: "Michael O'Connor",
    candidateId: 'michael-oconnor',
  },
  {
    id: '4',
    jobTitle: 'QA Engineer',
    appliedAgo: 'Applied 3 weeks ago',
    candidateName: 'Lina Rodriguez',
    candidateId: 'lina-rodriguez',
  },
];

// ─── People Search — Criteria Weights ────────────────────────────────────────

export const INITIAL_CRITERIA_WEIGHTS: CriteriaWeight[] = [
  { key: 'skillsFit', label: 'Skills Fit', value: 70 },
  { key: 'industryRelevance', label: 'Industry Relevance', value: 65 },
  { key: 'seniority', label: 'Seniority', value: 55 },
  { key: 'leadership', label: 'Leadership', value: 72 },
  { key: 'signalsEngagement', label: 'Signals/Engagement', value: 68 },
];

// ─── People Search — Parsed Criteria ─────────────────────────────────────────

export const PARSED_SEARCH_CRITERIA: ParsedSearchCriteria = {
  role: 'Senior Scientist',
  location: 'Australia',
  yearsOfExperience: '8+',
  skills: 'Research Leadership',
  industry: 'Biotech',
};

// ─── People Search — Filter Chips ────────────────────────────────────────────

export const INITIAL_SEARCH_FILTER_CHIPS: SearchFilterChip[] = [
  { id: 'role', label: 'Senior Scientist', removable: false },
  { id: 'location', label: 'Australia', removable: true },
  { id: 'experience', label: '8+ Years', removable: true },
];

// ─── People Search — Results ──────────────────────────────────────────────────

export const MOCK_SEARCH_RESULTS: SearchResultPerson[] = [
  {
    id: '1',
    name: 'Dr. Emily Zhang',
    title: 'Senior Scientist at BioTech Innovations',
    company: 'BioTech Innovations',
    location: 'Sydney, Australia',
    yearsExp: 10,
    matchPercent: 95,
    isLocked: false,
    savedToShortlist: false,
  },
  {
    id: '2',
    name: 'Dr. Sarah Lee',
    title: 'Research Director at Genomics Corp',
    company: 'Genomics Corp',
    location: 'Melbourne, Australia',
    yearsExp: 12,
    matchPercent: 89,
    isLocked: false,
    savedToShortlist: false,
  },
  {
    id: '3',
    name: 'Dr. Michael Tan',
    title: 'Biotech Consultant at PharmaTech',
    company: 'PharmaTech',
    location: 'Perth, Australia',
    yearsExp: 9,
    matchPercent: 87,
    isLocked: false,
    savedToShortlist: false,
  },
  {
    id: '4',
    name: 'Locked Candidate',
    title: '',
    company: '',
    location: '',
    yearsExp: 0,
    matchPercent: 82,
    isLocked: true,
    savedToShortlist: false,
  },
  {
    id: '5',
    name: 'Locked Candidate',
    title: '',
    company: '',
    location: '',
    yearsExp: 0,
    matchPercent: 79,
    isLocked: true,
    savedToShortlist: false,
  },
  {
    id: '6',
    name: 'Locked Candidate',
    title: '',
    company: '',
    location: '',
    yearsExp: 0,
    matchPercent: 76,
    isLocked: true,
    savedToShortlist: true,
  },
];

// ─── Candidate Profile ────────────────────────────────────────────────────────

export const MOCK_CANDIDATE_PROFILE: CandidateProfileData = {
  id: 'alex-johnson',
  name: 'Alex Johnson',
  title: 'Software Engineer',
  matchPercent: 85,
  sources: [
    { label: 'LinkedIn', href: '#' },
    { label: 'GitHub', href: '#' },
    { label: 'Referral', href: '#' },
  ],
  quickStats: {
    yearsOfExperience: '6 years',
    location: 'Austin, TX',
    availability: '2 weeks notice',
    salaryExpectation: '$120,000 – $140,000',
  },
  interviewFeedback: {
    rating: 4,
    ratingLabel: 'Very Good',
    summary:
      'Interviewers noted strong system design knowledge and pragmatic approach to scaling services. Recommended for on-site technical interview to evaluate leadership experience.',
    lead: 'Hannah Martinez',
    updatedAt: '2 days ago',
  },
  pipelineStatus: {
    appliedAt: 'Mar 10, 2026',
    currentStage: 'Technical Interview',
  },
  workExperience: [
    {
      id: '1',
      company: 'Nimbus Labs',
      role: 'Senior Software Engineer',
      period: 'Jan 2021 – Present',
      description:
        'Led a team of four engineers to design and implement a microservices-based platform for real-time analytics, reducing average response times by 40% and improving deployment frequency.',
    },
    {
      id: '2',
      company: 'BlueOrbit Technologies',
      role: 'Software Engineer',
      period: 'Jun 2018 – Dec 2020',
      description:
        'Built frontend components and backend APIs for the customer portal, introducing performance optimisations and improving user engagement metrics by 22%.',
    },
  ],
};

export const PROFILE_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  experience: 'Experience',
  skills: 'Skills',
  'interview-feedback': 'Interview Feedback',
  notes: 'Notes',
  activity: 'Activity',
};
