'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { sequencesApi, type SequenceDetailDto } from '@/lib/api';
import SequenceBuilder from '../../_builder/SequenceBuilder';

export default function EditSequencePage() {
  const { id } = useParams<{ id: string }>();
  const [sequence, setSequence] = useState<SequenceDetailDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    sequencesApi
      .getById(id)
      .then((d) => setSequence(d.sequence))
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-[var(--color-text-muted)]">Failed to load sequence.</p>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return <SequenceBuilder initialSequence={sequence} />;
}
