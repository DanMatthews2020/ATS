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

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;
