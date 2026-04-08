import { prisma } from '../lib/prisma';
import { EmployeeStatus as PrismaEmployeeStatus } from '@prisma/client';

// ── Public types (unchanged — frontend depends on these) ─────────────────────

export type EmployeeStatus = 'active' | 'on-leave' | 'terminated';

export interface Employee {
  id:          string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string | null;
  title:       string;
  department:  string;
  location:    string;
  status:      EmployeeStatus;
  hireDate:    string;
  managerId:   string | null;
  managerName: string | null;
  skills:      string[];
  avatarUrl:   string | null;
  bio:         string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const employeeInclude = {
  user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
  candidate: { select: { firstName: true, lastName: true, email: true, phone: true, skills: true } },
  manager: {
    include: {
      user: { select: { firstName: true, lastName: true } },
      candidate: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

function mapStatusOut(s: PrismaEmployeeStatus): EmployeeStatus {
  switch (s) {
    case 'ACTIVE':  return 'active';
    case 'ON_LEAVE': return 'on-leave';
    default:         return 'terminated';
  }
}

function mapStatusIn(s: EmployeeStatus): PrismaEmployeeStatus {
  switch (s) {
    case 'active':   return 'ACTIVE';
    case 'on-leave': return 'ON_LEAVE';
    default:         return 'INACTIVE';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getName(row: any): { first: string; last: string } {
  return {
    first: row.user?.firstName ?? row.candidate?.firstName ?? '',
    last:  row.user?.lastName  ?? row.candidate?.lastName  ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDto(row: any): Employee {
  const name = getName(row);
  let managerName: string | null = null;
  if (row.manager) {
    const mn = getName(row.manager);
    if (mn.first) managerName = `${mn.first} ${mn.last}`;
  }
  return {
    id:          row.id,
    firstName:   name.first,
    lastName:    name.last,
    email:       row.user?.email ?? row.candidate?.email ?? '',
    phone:       row.candidate?.phone ?? null,
    title:       row.jobTitle,
    department:  row.department,
    location:    row.workLocation ?? '',
    status:      mapStatusOut(row.status),
    hireDate:    row.startDate.toISOString().slice(0, 10),
    managerId:   row.managerId,
    managerName,
    skills:      row.candidate?.skills ?? [],
    avatarUrl:   row.user?.avatarUrl ?? null,
    bio:         null,
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const employeesService = {
  async getAll(params: { search?: string; department?: string; location?: string; status?: EmployeeStatus }): Promise<Employee[]> {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = mapStatusIn(params.status);
    if (params.department && params.department !== 'all') where.department = params.department;
    if (params.location && params.location !== 'all') where.workLocation = params.location;

    const rows = await prisma.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: { startDate: 'desc' },
    });

    let list = rows.map(toDto);

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q),
      );
    }

    return list.sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
  },

  async getById(id: string): Promise<Employee | null> {
    const row = await prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!row) return null;
    return toDto(row);
  },

  async getDepartments(): Promise<string[]> {
    const rows = await prisma.employee.findMany({
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });
    return rows.map((r) => r.department);
  },

  async getLocations(): Promise<string[]> {
    const rows = await prisma.employee.findMany({
      select: { workLocation: true },
      distinct: ['workLocation'],
      orderBy: { workLocation: 'asc' },
    });
    return rows.map((r) => r.workLocation).filter((l): l is string => l !== null);
  },

  async create(data: {
    firstName: string; lastName: string; email: string; phone?: string;
    title: string; department: string; location: string;
    hireDate: string; managerId?: string; skills?: string[]; bio?: string;
  }): Promise<Employee> {
    // Link to existing candidate or create one for personal info
    let candidate = await prisma.candidate.findUnique({ where: { email: data.email } });
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          firstName: data.firstName,
          lastName:  data.lastName,
          email:     data.email,
          phone:     data.phone ?? null,
          skills:    data.skills ?? [],
          source:    'DIRECT',
        },
      });
    }

    // Auto-generate unique employee number
    const count = await prisma.employee.count();
    const employeeNumber = `EMP-${String(count + 1).padStart(4, '0')}`;

    const row = await prisma.employee.create({
      data: {
        candidateId:    candidate.id,
        employeeNumber,
        department:     data.department,
        jobTitle:       data.title,
        workLocation:   data.location,
        startDate:      new Date(data.hireDate),
        employmentType: 'FULL_TIME',
        status:         'ACTIVE',
        managerId:      data.managerId || undefined,
      },
      include: employeeInclude,
    });

    return toDto(row);
  },

  async update(id: string, patch: Partial<Omit<Employee, 'id'>>): Promise<Employee | null> {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return null;

    // Map Employee-level fields to Prisma columns
    const prismaData: Record<string, unknown> = {};
    if (patch.title !== undefined)      prismaData.jobTitle     = patch.title;
    if (patch.department !== undefined)  prismaData.department   = patch.department;
    if (patch.location !== undefined)    prismaData.workLocation = patch.location;
    if (patch.status !== undefined)      prismaData.status       = mapStatusIn(patch.status);
    if (patch.hireDate !== undefined)    prismaData.startDate    = new Date(patch.hireDate);
    if (patch.managerId !== undefined)   prismaData.managerId    = patch.managerId || null;

    // Candidate-level fields (name, email, phone, skills)
    if (existing.candidateId) {
      const candidatePatch: Record<string, unknown> = {};
      if (patch.firstName !== undefined) candidatePatch.firstName = patch.firstName;
      if (patch.lastName !== undefined)  candidatePatch.lastName  = patch.lastName;
      if (patch.email !== undefined)     candidatePatch.email     = patch.email;
      if (patch.phone !== undefined)     candidatePatch.phone     = patch.phone;
      if (patch.skills !== undefined)    candidatePatch.skills    = patch.skills;
      if (Object.keys(candidatePatch).length > 0) {
        await prisma.candidate.update({ where: { id: existing.candidateId }, data: candidatePatch });
      }
    }

    const row = await prisma.employee.update({
      where: { id },
      data: prismaData,
      include: employeeInclude,
    });

    return toDto(row);
  },

  async exportCsv(): Promise<string> {
    const rows = await prisma.employee.findMany({ include: employeeInclude });
    const list = rows.map(toDto);
    const header = 'ID,First Name,Last Name,Email,Phone,Title,Department,Location,Status,Hire Date,Manager';
    const csvRows = list.map((e) =>
      [e.id, e.firstName, e.lastName, e.email, e.phone ?? '', e.title, e.department, e.location, e.status, e.hireDate, e.managerName ?? ''].join(','),
    );
    return [header, ...csvRows].join('\n');
  },
};
