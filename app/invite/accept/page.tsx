'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const invitation = searchParams.get('invitation');
  const organization = searchParams.get('organization');

  useEffect(() => {
    if (!invitation || !organization) {
      window.location.href = '/?error=invalid_invitation';
      return;
    }

    const authUrl = new URL('/auth/login', API_URL);
    authUrl.searchParams.set('invitation', invitation);
    authUrl.searchParams.set('organization', organization);

    window.location.href = authUrl.toString();
  }, [invitation, organization]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-slate">Redirecting to login...</p>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-slate">Loading...</p>
      </div>
    }>
      <InviteAcceptContent />
    </Suspense>
  );
}
