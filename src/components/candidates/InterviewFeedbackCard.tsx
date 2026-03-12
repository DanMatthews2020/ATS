import { Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { CandidateInterviewFeedback } from '@/types';

interface InterviewFeedbackCardProps {
  feedback: CandidateInterviewFeedback;
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={14}
          aria-hidden="true"
          className={i < rating ? 'text-amber-400' : 'text-neutral-200'}
          fill={i < rating ? 'currentColor' : 'currentColor'}
        />
      ))}
    </div>
  );
}

export function InterviewFeedbackCard({ feedback }: InterviewFeedbackCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-primary)]">
          Interview Feedback
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Lead: {feedback.lead}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-[var(--color-primary)]">
          {feedback.ratingLabel}
        </span>
        <StarRating rating={feedback.rating} />
      </div>

      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        {feedback.summary}
      </p>
    </Card>
  );
}
