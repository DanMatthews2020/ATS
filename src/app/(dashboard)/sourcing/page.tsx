import Link from 'next/link';
import { Search, Users, Sparkles, Globe, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sourcing — TeamTalent',
};

const SOURCING_TOOLS = [
  {
    href: '/sourcing/people',
    icon: Users,
    label: 'People Search',
    description:
      'Search across millions of profiles using natural language. Our AI parses your criteria and ranks candidates by weighted fit scores across skills, seniority, industry, and engagement signals.',
    features: ['AI-parsed natural language queries', 'Weighted match scoring', 'Broad or exact match modes', 'One-click shortlisting'],
    cta: 'Open People Search',
    accent: 'bg-[var(--color-primary)]',
  },
  {
    href: '/sourcing/ai-agent',
    icon: Sparkles,
    label: 'AI Sourcing Agent',
    description:
      'Set your hiring criteria once and let the agent run continuously. It evaluates new profiles, surfaces top candidates, and drafts personalised outreach — all without manual input.',
    features: ['Autopilot candidate evaluation', 'Automated outreach drafts', 'Real-time pipeline updates', 'Configurable run schedules'],
    cta: 'Launch Agent',
    accent: 'bg-[var(--color-accent)]',
  },
  {
    href: '/sourcing/unified',
    icon: Globe,
    label: 'Unified Search',
    description:
      'Search across every sourcing channel — LinkedIn, GitHub, your internal talent pool, and more — from a single interface. De-duplicate results and compare candidates side by side.',
    features: ['Cross-channel search in one place', 'Automatic de-duplication', 'Side-by-side comparison', 'Export to pipeline in one click'],
    cta: 'Open Unified Search',
    accent: 'bg-indigo-600',
  },
];

export default function SourcingPage() {
  return (
    <div className="p-8 flex-1">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 mb-2">
        <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
          <Search size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
            Sourcing
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Find and engage top talent across multiple channels
          </p>
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-8 max-w-2xl">
        Choose a sourcing tool below. Each is designed for a different stage of your search —
        from targeted people lookup to fully autonomous agent-driven pipeline building.
      </p>

      {/* ── Tool cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SOURCING_TOOLS.map(({ href, icon: Icon, label, description, features, cta, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col bg-white border border-[var(--color-border)] rounded-2xl shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
          >
            {/* Card header stripe */}
            <div className={`${accent} px-6 py-5`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Icon size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">{label}</h2>
            </div>

            {/* Card body */}
            <div className="flex flex-col flex-1 px-6 py-5">
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-5">
                {description}
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-border)] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                {cta}
                <ArrowRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
