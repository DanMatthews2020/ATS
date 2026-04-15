import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Notice — Recruitment',
};

const P = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-amber-100 text-amber-800 px-1 rounded font-mono text-sm">{children}</span>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <p className="text-lg font-semibold text-gray-900">TeamTalent</p>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Notice — Recruitment</h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: <P>[DATE]</P>
        </p>

        <section className="space-y-8">
          {/* Section 1 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p className="text-gray-700 leading-relaxed">
              <P>[COMPANY_NAME]</P> is the data controller for the personal data processed during
              recruitment. If you have questions about how we handle your data, contact our Data
              Protection team at <P>[DATA_PROTECTION_EMAIL]</P>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              Registered address: <P>[COMPANY_ADDRESS]</P>.
            </p>
          </article>

          {/* Section 2 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. What Data We Collect</h2>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-1">
              <li>Full name, email address, and phone number</li>
              <li>Postal address (if included in your CV)</li>
              <li>Employment history and education</li>
              <li>CV and supporting documents</li>
              <li>Interview notes and feedback</li>
            </ul>
          </article>

          {/* Section 3 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Why We Process Your Data and Legal Basis</h2>
            <p className="text-gray-700 leading-relaxed">
              We process your personal data to assess your suitability for roles at{' '}
              <P>[COMPANY_NAME]</P>. Our legal basis for this processing is Legitimate Interests
              under GDPR Article 6(1)(f).
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              If we wish to retain your data in a talent pool beyond the active recruitment process,
              we will request your explicit consent.
            </p>
          </article>

          {/* Section 4 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Retention Periods</h2>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-1">
              <li><strong>Active candidates:</strong> Duration of the recruitment process.</li>
              <li><strong>Unsuccessful candidates:</strong> Up to 12 months after the process concludes.</li>
              <li><strong>Talent pool (with consent):</strong> Up to 24 months from the date consent is given.</li>
              <li><strong>Hired candidates:</strong> ATS record is anonymised; data is transferred to the HR system.</li>
            </ul>
          </article>

          {/* Section 5 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Who Can See Your Data</h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is accessible only to recruiters and the relevant hiring team. We do not
              share your data with third parties for marketing or other purposes.
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              Our platform is hosted on Vercel (EU region) under a Data Processing Agreement.
              You can review Vercel&apos;s privacy policy at{' '}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                vercel.com/legal/privacy-policy
              </a>.
            </p>
          </article>

          {/* Section 6 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed">Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-1 mt-2">
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Erasure</strong> of your personal data</li>
              <li><strong>Rectification</strong> of inaccurate data</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong>Object</strong> to our processing of your data</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-2">
              To exercise any of these rights, please email{' '}
              <P>[DATA_PROTECTION_EMAIL]</P>. We will respond within 30 calendar days.
            </p>
          </article>

          {/* Section 7 */}
          <article>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Supervisory Authority</h2>
            <p className="text-gray-700 leading-relaxed">
              If you believe your data protection rights have not been respected, you have the right
              to lodge a complaint with the Dutch Data Protection Authority:
            </p>
            <p className="text-gray-700 leading-relaxed mt-2">
              <strong>Autoriteit Persoonsgegevens (AP)</strong><br />
              <a
                href="https://autoriteitpersoonsgegevens.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                autoriteitpersoonsgegevens.nl
              </a><br />
              +31 70 888 8500
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
