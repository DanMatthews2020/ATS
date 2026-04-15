// TODO: wire into email provider (Resend/SendGrid).
// Pass html/text to your provider's send function.

export function generatePrivacyNoticeEmail(params: {
  candidateName: string;
  recruiterName: string;
  companyName: string;
  appBaseUrl: string;
}): { html: string; text: string } {
  const { candidateName, recruiterName, companyName, appBaseUrl } = params;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Privacy Notice — ${companyName}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 24px;">Privacy Notice</h1>
  <p>Dear ${candidateName},</p>
  <p>Thank you for your interest in opportunities at <strong>${companyName}</strong>. This notice explains how we handle your personal data during the recruitment process.</p>

  <h2 style="font-size: 16px; margin-top: 24px;">1. Who we are</h2>
  <p>${companyName} is the data controller responsible for your personal data. This notice has been sent by ${recruiterName}.</p>

  <h2 style="font-size: 16px; margin-top: 24px;">2. What data we collect</h2>
  <p>We collect and process the following categories of personal data:</p>
  <ul>
    <li>Name and contact details (email, phone number, address)</li>
    <li>CV / resume and cover letter</li>
    <li>Employment history and qualifications</li>
    <li>Interview notes and assessment scores</li>
    <li>Any additional information you provide during the application process</li>
  </ul>

  <h2 style="font-size: 16px; margin-top: 24px;">3. Why we process your data</h2>
  <p>We process your personal data for the purpose of recruitment under <strong>Legitimate Interests</strong> (GDPR Article 6(1)(f)). Our legitimate interest is to assess your suitability for employment and manage the recruitment process effectively.</p>

  <h2 style="font-size: 16px; margin-top: 24px;">4. How long we keep your data</h2>
  <ul>
    <li><strong>Active candidates:</strong> for the duration of the recruitment process</li>
    <li><strong>Unsuccessful candidates:</strong> 12 months from the date of the hiring decision</li>
    <li><strong>Talent pool (with consent):</strong> up to 24 months</li>
  </ul>

  <h2 style="font-size: 16px; margin-top: 24px;">5. Who sees your data</h2>
  <p>Your data is accessible only to authorised recruiters and hiring team members at ${companyName}. Our recruitment platform is hosted on Vercel (EU region).</p>

  <h2 style="font-size: 16px; margin-top: 24px;">6. Your rights</h2>
  <p>Under the GDPR, you have the right to:</p>
  <ul>
    <li><strong>Access</strong> — request a copy of your personal data</li>
    <li><strong>Erasure</strong> — request deletion of your personal data</li>
    <li><strong>Rectification</strong> — correct inaccurate personal data</li>
    <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
    <li><strong>Objection</strong> — object to the processing of your personal data</li>
  </ul>
  <p>To exercise any of these rights, contact us at: <strong>[DATA_PROTECTION_EMAIL]</strong></p>

  <h2 style="font-size: 16px; margin-top: 24px;">7. Supervisory authority</h2>
  <p>If you believe your data protection rights have been violated, you may lodge a complaint with the Autoriteit Persoonsgegevens at <a href="https://autoriteitpersoonsgegevens.nl">autoriteitpersoonsgegevens.nl</a>.</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
  <p style="font-size: 14px; color: #666;">
    <a href="${appBaseUrl}/privacy-policy">View our full privacy policy</a>
  </p>
</body>
</html>`;

  const text = `Privacy Notice

Dear ${candidateName},

Thank you for your interest in opportunities at ${companyName}. This notice explains how we handle your personal data during the recruitment process.

1. Who we are
${companyName} is the data controller responsible for your personal data. This notice has been sent by ${recruiterName}.

2. What data we collect
We collect and process the following categories of personal data:
- Name and contact details (email, phone number, address)
- CV / resume and cover letter
- Employment history and qualifications
- Interview notes and assessment scores
- Any additional information you provide during the application process

3. Why we process your data
We process your personal data for the purpose of recruitment under Legitimate Interests (GDPR Article 6(1)(f)). Our legitimate interest is to assess your suitability for employment and manage the recruitment process effectively.

4. How long we keep your data
- Active candidates: for the duration of the recruitment process
- Unsuccessful candidates: 12 months from the date of the hiring decision
- Talent pool (with consent): up to 24 months

5. Who sees your data
Your data is accessible only to authorised recruiters and hiring team members at ${companyName}. Our recruitment platform is hosted on Vercel (EU region).

6. Your rights
Under the GDPR, you have the right to:
- Access — request a copy of your personal data
- Erasure — request deletion of your personal data
- Rectification — correct inaccurate personal data
- Portability — receive your data in a structured, machine-readable format
- Objection — object to the processing of your personal data

To exercise any of these rights, contact us at: [DATA_PROTECTION_EMAIL]

7. Supervisory authority
If you believe your data protection rights have been violated, you may lodge a complaint with the Autoriteit Persoonsgegevens at autoriteitpersoonsgegevens.nl.

---
View our full privacy policy: ${appBaseUrl}/privacy-policy
`;

  return { html, text };
}
