/**
 * API Proxy Route
 * 
 * Proxies requests from /api/* to the Express backend
 * This allows the frontend to make requests to /api/zones/... 
 * which get forwarded to the backend API
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  return handleProxy(request, await params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  return handleProxy(request, await params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  return handleProxy(request, await params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  return handleProxy(request, await params, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  return handleProxy(request, await params, 'PATCH');
}

async function handleProxy(
  request: NextRequest,
  params: { proxy: string[] },
  method: string
) {
  try {
    const path = params.proxy.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    
    const backendUrl = `${API_BASE_URL}/api/${path}${queryString}`;
    
    // Forward headers (especially Authorization)
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Don't forward host header
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });
    
    // Get body for POST/PUT/PATCH requests
    let body = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await request.text();
    }
    
    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    });
    
    // Get response data
    const data = await response.text();
    
    // Forward response
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      {
        error: 'Backend API unavailable',
        message: error.message,
        details: 'Make sure the Express backend is running on ' + API_BASE_URL,
      },
      { status: 503 }
    );
  }
}


