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

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
export type CreateCandidateInput = z.infer<typeof CreateCandidateSchema>;
export type UpdateApplicationStageInput = z.infer<typeof UpdateApplicationStageSchema>;
