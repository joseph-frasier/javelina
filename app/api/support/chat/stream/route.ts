/**
 * Streaming proxy for support chat stream.
 * Forwards POST to the Express backend and streams the SSE response back.
 * Using a dedicated route ensures the response is streamed (not buffered by
 * Next.js rewrite), and we explicitly forward Cookie + Authorization for auth.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function copySetCookieHeaders(source: Headers, target: Headers) {
  const getSetCookie = (source as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === 'function') {
    for (const cookie of getSetCookie.call(source)) {
      target.append('Set-Cookie', cookie);
    }
    return;
  }

  const fallbackCookie = source.get('set-cookie');
  if (fallbackCookie) {
    target.append('Set-Cookie', fallbackCookie);
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = `${API_BASE_URL}/api/support/chat/stream`;

    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        headers.set(key, value);
      }
    });

    const body = await request.text();

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body,
    });

    if (!backendResponse.ok) {
      const errorBody = await backendResponse.text();
      const responseHeaders = new Headers();
      const contentType = backendResponse.headers.get('Content-Type') || 'application/json';
      responseHeaders.set('Content-Type', contentType);
      copySetCookieHeaders(backendResponse.headers, responseHeaders);
      return new NextResponse(errorBody, {
        status: backendResponse.status,
        headers: responseHeaders,
      });
    }

    const responseHeaders = new Headers();
    const contentType = backendResponse.headers.get('Content-Type') || 'text/event-stream';
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'no-cache');
    responseHeaders.set('Connection', 'keep-alive');
    responseHeaders.set('X-Accel-Buffering', 'no');
    copySetCookieHeaders(backendResponse.headers, responseHeaders);

    return new NextResponse(backendResponse.body ?? null, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    console.error('[support/chat/stream] Proxy error:', error);
    return NextResponse.json(
      {
        error: 'Backend API unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: `Ensure the Express backend is running on ${API_BASE_URL}`,
      },
      { status: 503 }
    );
  }
}
