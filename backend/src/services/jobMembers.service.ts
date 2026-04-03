import { jobMembersRepository } from '../repositories/jobMembers.repository';

export interface JobMemberDto {
  id: string;
  role: string;
  addedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
}

type MemberRow = Awaited<ReturnType<typeof jobMembersRepository.findByJobId>>[number];

function toDto(m: MemberRow): JobMemberDto {
  return {
    id: m.id,
    role: m.role,
    addedAt: m.addedAt.toISOString(),
    user: {
      id:         m.user.id,
      firstName:  m.user.firstName,
      lastName:   m.user.lastName,
      email:      m.user.email,
      avatarUrl:  m.user.avatarUrl,
    },
  };
}

export const jobMembersService = {
  async getByJobId(jobId: string): Promise<JobMemberDto[]> {
    const rows = await jobMembersRepository.findByJobId(jobId);
    return rows.map(toDto);
  },

  async add(jobId: string, userId: string, role: string): Promise<JobMemberDto> {
    const row = await jobMembersRepository.add(jobId, userId, role);
    return toDto(row);
  },

  async remove(memberId: string): Promise<boolean> {
    const existing = await jobMembersRepository.findById(memberId);
    if (!existing) return false;
    await jobMembersRepository.removeById(memberId);
    return true;
  },
};
