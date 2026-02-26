import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface InviteAcceptPageProps {
  searchParams: Promise<{
    invitation?: string;
    organization?: string;
  }>;
}

export default async function InviteAcceptPage({ searchParams }: InviteAcceptPageProps) {
  const { invitation, organization } = await searchParams;

  if (!invitation || !organization) {
    redirect('/?error=invalid_invitation');
  }

  const authUrl = new URL('/auth/login', API_URL);
  authUrl.searchParams.set('invitation', invitation);
  authUrl.searchParams.set('organization', organization);

  redirect(authUrl.toString());
}
