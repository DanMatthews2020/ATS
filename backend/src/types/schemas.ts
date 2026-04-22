import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const CreateJobSchema = z.object({
  title: z.string().min(1).max(255),
  department: z.string().min(1).max(100),
  location: z.string().min(1).max(255),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ON_HOLD']).optional().default('DRAFT'),
  description: z.string().min(1),
  requirements: z.string().optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
});

export const UpdateJobSchema = CreateJobSchema.partial();

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});

// ─── Candidates ───────────────────────────────────────────────────────────────

export const CreateCandidateSchema = z.object({
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().min(1, 'Last name is required'),
  email:        z.string().email('Invalid email address'),
  phone:        z.string().optional(),
  linkedInUrl:  z.string().optional(),
  location:     z.string().optional(),
  source:       z.enum(['REFERRAL', 'JOB_BOARD', 'DIRECT', 'AGENCY', 'AI_SOURCED']).default('JOB_BOARD'),
  skills:       z.array(z.string()).default([]),
});

// ─── Applications ─────────────────────────────────────────────────────────────

export const UpdateApplicationStageSchema = z.object({
  status: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']),
});

export const CreateApplicationSchema = z.object({
  candidateId:  z.string().uuid(),
  jobPostingId: z.string().uuid(),
  status: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'])
    .optional()
    .default('APPLIED'),
});

// ─── Privacy & Consent ───────────────────────────────────────────────────────

export const PrivacyUpdateSchema = z.object({
  legalBasis: z.enum(['LEGITIMATE_INTERESTS', 'CONSENT', 'CONTRACT']).optional(),
  consentGivenAt: z.string().datetime().optional(),
  consentScope: z.string().max(500).optional(),
  retentionExpiresAt: z.string().datetime().optional(),
  retentionNote: z.string().max(200).optional(),
});

export type PrivacyUpdateInput = z.infer<typeof PrivacyUpdateSchema>;

// ─── Rights Requests ─────────────────────────────────────────────────────────

export const CreateRightsRequestSchema = z.object({
  requesterEmail: z.string().email('Valid email is required'),
  requestType: z.enum(['SAR', 'ERASURE', 'PORTABILITY', 'RECTIFICATION', 'OBJECTION']),
  receivedAt: z.string().datetime(),
  candidateId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateRightsRequestSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'FULFILLED', 'REJECTED', 'OVERDUE']).optional(),
  notes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
});

export type CreateRightsRequestInput = z.infer<typeof CreateRightsRequestSchema>;
export type UpdateRightsRequestInput = z.infer<typeof UpdateRightsRequestSchema>;

// ─── RoPA ───────────────────────────────────────────────────────────────────

export const CreateRopaEntrySchema = z.object({
  processingActivity: z.string().min(1, 'Processing activity is required').max(500),
  purpose: z.string().min(1, 'Purpose is required').max(1000),
  legalBasis: z.string().min(1, 'Legal basis is required').max(500),
  dataCategories: z.array(z.string()).min(1, 'At least one data category is required'),
  dataSubjects: z.string().min(1, 'Data subjects is required').max(500),
  recipients: z.string().min(1, 'Recipients is required').max(500),
  retentionPeriod: z.string().min(1, 'Retention period is required').max(500),
  securityMeasures: z.string().min(1, 'Security measures is required').max(2000),
  transfersOutsideEEA: z.boolean().default(false),
  transferMechanism: z.string().max(500).optional(),
});

export const UpdateRopaEntrySchema = CreateRopaEntrySchema.partial();

export type CreateRopaEntryInput = z.infer<typeof CreateRopaEntrySchema>;
export type UpdateRopaEntryInput = z.infer<typeof UpdateRopaEntrySchema>;

// ─── Rejection Reasons ────────────────────────────────────────────────────────

export const CreateRejectionReasonSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  description: z.string().max(300).optional(),
});

export const UpdateRejectionReasonSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateRejectionReasonInput = z.infer<typeof CreateRejectionReasonSchema>;
export type UpdateRejectionReasonInput = z.infer<typeof UpdateRejectionReasonSchema>;

// ─── Application Rejection ────────────────────────────────────────────────────

export const RejectApplicationSchema = z.object({
  reasonId: z.string().min(1).optional(),
  reasonLabel: z.string().min(1, 'Rejection reason is required').max(100),
  note: z.string().max(500).optional(),
});

export type RejectApplicationInput = z.infer<typeof RejectApplicationSchema>;

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
export type CreateCandidateInput = z.infer<typeof CreateCandidateSchema>;
export type UpdateApplicationStageInput = z.infer<typeof UpdateApplicationStageSchema>;
