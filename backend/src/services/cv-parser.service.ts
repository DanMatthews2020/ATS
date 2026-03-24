import Anthropic from '@anthropic-ai/sdk';

export interface ParsedCvData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  location?: string;
  title?: string;    // most recent job title
  company?: string;  // most recent employer
  skills: string[];
}

const EXTRACTION_PROMPT = `Extract the candidate's information from this CV/resume.
Return ONLY a JSON object with these exact fields (omit any field you cannot identify with confidence):
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "linkedInUrl": "string (full URL)",
  "location": "string (city and state/country)",
  "title": "string (current or most recent job title)",
  "company": "string (current or most recent employer)",
  "skills": ["array of up to 15 technical and professional skills"]
}
Return only valid JSON — no markdown fences, no explanation, nothing else.`;

export async function parseCvBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<ParsedCvData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server');
  }

  const client = new Anthropic({ apiKey });

  // Build message content based on file type
  let content: Anthropic.MessageParam['content'];

  if (mimeType === 'application/pdf') {
    content = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: buffer.toString('base64'),
        },
      } as Anthropic.DocumentBlockParam,
      { type: 'text', text: EXTRACTION_PROMPT },
    ];
  } else {
    // Plain text CV
    content = `${buffer.toString('utf-8')}\n\n---\n\n${EXTRACTION_PROMPT}`;
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';

  // Strip accidental markdown code fences if present
  const json = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/m, '')
    .trim();

  try {
    const parsed = JSON.parse(json) as ParsedCvData;
    return {
      ...parsed,
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 20) : [],
    };
  } catch {
    return { skills: [] };
  }
}
