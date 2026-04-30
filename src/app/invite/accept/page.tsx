import { Suspense } from 'react';
import AcceptInviteContent from './AcceptInviteContent';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteLoadingFallback />}>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-sm px-6">
        <div className="h-8 bg-gray-100 rounded w-32 mx-auto" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
