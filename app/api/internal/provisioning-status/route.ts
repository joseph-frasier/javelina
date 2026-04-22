// app/api/internal/provisioning-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api/api-key';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  const authFail = requireApiKey(req, env.INTAKE_TO_JAVELINA_API_KEY);
  if (authFail) return authFail;

  return NextResponse.json({ status: 'ok' });
}