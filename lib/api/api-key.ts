// lib/api/apiKey.ts
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export function requireApiKey(
  req: NextRequest,
  expectedKey: string
): NextResponse | null {
  const provided = req.headers.get('x-api-key');
  if (!provided) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expectedKey);
  if (a.length !== b.length) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  const valid = timingSafeEqual(a, b);
  if (!valid) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  return null;
}