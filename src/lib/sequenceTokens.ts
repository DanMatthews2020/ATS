/**
 * Sequence template tokens — display names, template variables, categories, icons.
 * Used by the token picker and the server-side tokenResolver.
 */

export interface SequenceToken {
  label: string;
  variable: string;                          // e.g. "{{candidateFirstName}}"
  category: 'candidate' | 'sender' | 'job';
  icon: 'eq' | 'h1';
  hasInfo?: boolean;
}

export const SEQUENCE_TOKENS: SequenceToken[] = [
  // ── Candidate ──────────────────────────────────────────────────────────────
  { label: "Day of Week",                                    variable: '{{dayOfWeek}}',              category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's First Name",                         variable: '{{candidateFirstName}}',     category: 'candidate', icon: 'eq' },
  { label: "Candidate's Full Name",                          variable: '{{candidateFullName}}',      category: 'candidate', icon: 'eq' },
  { label: "Candidate's Company",                            variable: '{{candidateCompany}}',       category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's School",                             variable: '{{candidateSchool}}',        category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's Current Title",                      variable: '{{candidateCurrentTitle}}',  category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's Phone Number",                       variable: '{{candidatePhone}}',         category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's LinkedIn Profile URL",               variable: '{{candidateLinkedIn}}',      category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's Email Address (Primary, Personal)",  variable: '{{candidateEmail}}',         category: 'candidate', icon: 'eq', hasInfo: true },
  { label: "Candidate's Candidate Profile Link",             variable: '{{candidateProfileLink}}',   category: 'candidate', icon: 'h1', hasInfo: true },
  { label: "Candidate's Referrer's First Name",              variable: '{{candidateReferrerFirst}}', category: 'candidate', icon: 'eq' },
  { label: "Candidate's Referrer's Full Name",               variable: '{{candidateReferrerFull}}',  category: 'candidate', icon: 'eq' },

  // ── Sender ─────────────────────────────────────────────────────────────────
  { label: "Sender's First Name",         variable: '{{senderFirstName}}',    category: 'sender', icon: 'eq', hasInfo: true },
  { label: "Sender's Full Name",          variable: '{{senderFullName}}',     category: 'sender', icon: 'eq', hasInfo: true },
  { label: "Sender's Email Address",      variable: '{{senderEmail}}',        category: 'sender', icon: 'eq', hasInfo: true },
  { label: "Sender's Phone Number",       variable: '{{senderPhone}}',        category: 'sender', icon: 'eq', hasInfo: true },
  { label: "Sender's LinkedIn Profile URL", variable: '{{senderLinkedIn}}',   category: 'sender', icon: 'eq', hasInfo: true },
  { label: "Sender's Calendar Link",      variable: '{{senderCalendarLink}}', category: 'sender', icon: 'eq', hasInfo: true },

  // ── Job ────────────────────────────────────────────────────────────────────
  { label: "Job Title",    variable: '{{jobTitle}}',    category: 'job', icon: 'eq' },
  { label: "Job Location", variable: '{{jobLocation}}', category: 'job', icon: 'eq' },
  { label: "Company Name", variable: '{{companyName}}', category: 'job', icon: 'eq' },
];

/** Reverse map: "{{candidateFirstName}}" → "Candidate's First Name" */
export const TOKEN_VARIABLE_TO_LABEL = new Map<string, string>(
  SEQUENCE_TOKENS.map((t) => [t.variable, t.label]),
);

/** Category header labels */
export const CATEGORY_LABELS: Record<SequenceToken['category'], string> = {
  candidate: 'CANDIDATE TOKENS',
  sender:    'SENDER TOKENS',
  job:       'JOB TOKENS',
};
