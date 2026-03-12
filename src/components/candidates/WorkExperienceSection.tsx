import { Card } from '@/components/ui/Card';
import type { WorkExperienceEntry } from '@/types';

interface WorkExperienceSectionProps {
  entries: WorkExperienceEntry[];
}

export function WorkExperienceSection({ entries }: WorkExperienceSectionProps) {
  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-[var(--color-primary)] mb-5">
        Work Experience
      </h3>

      <div className="space-y-6">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="relative">
            {/* Timeline connector */}
            {idx < entries.length - 1 ? (
              <div className="absolute left-0 top-6 bottom-[-1.5rem] w-px bg-[var(--color-border)]" />
            ) : null}

            <div className="pl-0">
              <div className="flex items-start gap-3">
                {/* Dot */}
                <div className="mt-1.5 w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-primary)] leading-snug">
                    {entry.company}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {entry.role} &bull; {entry.period}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-2">
                    {entry.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
