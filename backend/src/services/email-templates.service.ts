import { emailTemplatesRepository } from '../repositories/email-templates.repository';
import type { EmailTemplate } from '@prisma/client';

export interface EmailTemplateDto {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isShared: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

function map(t: EmailTemplate): EmailTemplateDto {
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    body: t.body,
    isShared: t.isShared,
    createdById: t.createdById,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export const emailTemplatesService = {
  getAll: async (userId?: string): Promise<EmailTemplateDto[]> => {
    const items = await emailTemplatesRepository.findAll(userId);
    return items.map(map);
  },

  getById: async (id: string): Promise<EmailTemplateDto | null> => {
    const item = await emailTemplatesRepository.findById(id);
    return item ? map(item) : null;
  },

  create: async (data: {
    name: string;
    category: string;
    subject: string;
    body: string;
    isShared: boolean;
    createdById: string;
  }): Promise<EmailTemplateDto> => {
    const item = await emailTemplatesRepository.create(data);
    return map(item);
  },

  update: async (
    id: string,
    data: { name?: string; category?: string; subject?: string; body?: string; isShared?: boolean },
  ): Promise<EmailTemplateDto> => {
    const item = await emailTemplatesRepository.update(id, data);
    return map(item);
  },

  delete: async (id: string): Promise<void> => {
    await emailTemplatesRepository.delete(id);
  },
};
