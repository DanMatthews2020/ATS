import { Suspense } from 'react';
import ArchiveContent from './ArchiveContent';

export default function ArchivePage() {
  return (
    <Suspense fallback={<ArchiveLoadingFallback />}>
      <ArchiveContent />
    </Suspense>
  );
}

function ArchiveLoadingFallback() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-100 rounded w-48" />
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="h-10 bg-gray-100 rounded mt-6" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
