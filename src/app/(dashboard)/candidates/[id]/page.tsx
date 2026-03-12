'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, HelpCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { WorkExperienceSection } from '@/components/candidates/WorkExperienceSection';
import { QuickStatsCard } from '@/components/candidates/QuickStatsCard';
import { InterviewFeedbackCard } from '@/components/candidates/InterviewFeedbackCard';
import { PipelineStatusCard } from '@/components/candidates/PipelineStatusCard';
import { MOCK_CANDIDATE_PROFILE, PROFILE_TAB_LABELS } from '@/lib/constants';
import type { ProfileTab } from '@/types';

const TABS = Object.entries(PROFILE_TAB_LABELS).map(([key, label]) => ({
  key,
  label,
}));

export default function CandidateProfilePage() {
  const candidate = MOCK_CANDIDATE_PROFILE;
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  return (
    <div className="flex flex-col flex-1">
      {/* ── Top action bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-3.5 bg-white border-b border-[var(--color-border)] flex-shrink-0">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/candidates"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline"
          >
            Candidates
          </Link>
          <ChevronRight size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
          <span className="font-medium text-[var(--color-primary)]">
            {candidate.name}
          </span>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm">
            <Plus size={14} aria-hidden="true" />
            New Candidate
          </Button>
          <Button variant="secondary" size="sm">
            <HelpCircle size={14} aria-hidden="true" />
            Help
          </Button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        {/* ── Candidate header card ──────────────────────────────────────── */}
        <Card padding="md">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar name={candidate.name} size="lg" />
            </div>

            {/* Name / title / match */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-primary)] leading-snug">
                  {candidate.name}
                </h1>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {candidate.title}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="success">
                  {candidate.matchPercent}% match
                </Badge>
                {candidate.sources.map((source) => (
                  <a
                    key={source.label}
                    href={source.href}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
                  >
                    {source.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <Button variant="primary" size="sm">
                Add to Pipeline
              </Button>
              <Button variant="secondary" size="sm">
                Save Candidate
              </Button>
              <Button variant="primary" size="sm">
                Schedule Interview
              </Button>
              <Button variant="secondary" size="sm">
                Export
              </Button>
            </div>
          </div>

          {/* Breadcrumb within card */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <nav aria-label="Profile breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Link href="/candidates" className="hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline">
                Candidates
              </Link>
              <ChevronRight size={12} aria-hidden="true" />
              <span className="text-[var(--color-primary)] font-medium">
                {candidate.name}
              </span>
            </nav>
          </div>
        </Card>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <Card padding="none">
          <div className="px-5">
            <Tabs
              tabs={TABS}
              activeTab={activeTab}
              onChange={(key) => setActiveTab(key as ProfileTab)}
            />
          </div>
        </Card>

        {/* ── Tab content + right sidebar ───────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Left: tab panels */}
          <div className="space-y-4">
            <TabPanel id="overview" activeTab={activeTab}>
              {/* Overview placeholder banner */}
              <Card padding="lg" className="min-h-[140px] flex items-center justify-center">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Candidate overview summary will appear here.
                </p>
              </Card>
            </TabPanel>

            <TabPanel id="experience" activeTab={activeTab}>
              <WorkExperienceSection entries={candidate.workExperience} />
            </TabPanel>

            <TabPanel id="skills" activeTab={activeTab}>
              <Card padding="md">
                <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-4">
                  Skills
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Skills information not yet available.
                </p>
              </Card>
            </TabPanel>

            <TabPanel id="interview-feedback" activeTab={activeTab}>
              <Card padding="md">
                <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-4">
                  Interview Feedback
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {candidate.interviewFeedback.summary}
                </p>
              </Card>
            </TabPanel>

            <TabPanel id="notes" activeTab={activeTab}>
              <Card padding="md">
                <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-4">
                  Notes
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  No notes yet. Add a note to keep track of important details.
                </p>
              </Card>
            </TabPanel>

            <TabPanel id="activity" activeTab={activeTab}>
              <Card padding="md">
                <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-4">
                  Activity
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  No activity recorded yet.
                </p>
              </Card>
            </TabPanel>

            {/* Work experience is always visible below the active tab */}
            {activeTab === 'overview' || activeTab === 'experience' ? (
              <WorkExperienceSection entries={candidate.workExperience} />
            ) : null}
          </div>

          {/* Right: sidebar cards */}
          <div className="space-y-4">
            <QuickStatsCard
              stats={candidate.quickStats}
              updatedAt={candidate.interviewFeedback.updatedAt}
            />
            <InterviewFeedbackCard feedback={candidate.interviewFeedback} />
            <PipelineStatusCard status={candidate.pipelineStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
