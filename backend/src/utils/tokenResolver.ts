/**
 * @file tokenResolver.ts
 * @description Replaces {{token}} placeholders in email templates with candidate/job data.
 *
 * Supported tokens:
 *   {{firstName}}           — candidate first name
 *   {{lastName}}            — candidate last name
 *   {{fullName}}            — candidate full name
 *   {{email}}               — candidate email
 *   {{currentCompany}}      — candidate's current employer (or empty string)
 *   {{jobTitle}}            — job posting title
 *   {{jobDepartment}}       — job posting department
 *   {{jobLocation}}         — job posting location
 *   {{senderName}}          — name of the recruiter sending the email
 *   {{senderEmail}}         — email of the recruiter sending the email
 *   {{companyName}}         — your company name (TeamTalent placeholder)
 *   {{sequenceName}}        — name of the sequence
 *   {{unsubscribeLink}}     — placeholder unsubscribe URL
 */

export interface TokenData {
  candidate?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    currentCompany?: string | null;
  };
  job?: {
    title?: string;
    department?: string;
    location?: string;
  };
  sender?: {
    name?: string;
    email?: string;
  };
  sequence?: {
    name?: string;
  };
  companyName?: string;
  unsubscribeLink?: string;
}

/**
 * Replace all {{token}} occurrences in a template string with resolved values.
 * Unknown tokens are left as-is so they are visible in output for debugging.
 */
export function resolveTokens(template: string, data: TokenData): string {
  const map: Record<string, string> = {
    firstName:      data.candidate?.firstName ?? '',
    lastName:       data.candidate?.lastName ?? '',
    fullName:       [data.candidate?.firstName, data.candidate?.lastName].filter(Boolean).join(' '),
    email:          data.candidate?.email ?? '',
    currentCompany: data.candidate?.currentCompany ?? '',
    jobTitle:       data.job?.title ?? '',
    jobDepartment:  data.job?.department ?? '',
    jobLocation:    data.job?.location ?? '',
    senderName:     data.sender?.name ?? '',
    senderEmail:    data.sender?.email ?? '',
    companyName:    data.companyName ?? 'TeamTalent',
    sequenceName:   data.sequence?.name ?? '',
    unsubscribeLink: data.unsubscribeLink ?? '#unsubscribe',
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
    return token in map ? map[token] : `{{${token}}}`;
  });
}
