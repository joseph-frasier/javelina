/**
 * Health Check Endpoint
 * 
 * Tests connectivity to the Express backend
 */

import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    // Test connection to backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json({
        status: 'ok',
        backend: 'connected',
        backendUrl: API_BASE_URL,
        backendResponse: data,
      });
    } else {
      return NextResponse.json({
        status: 'error',
        backend: 'unreachable',
        backendUrl: API_BASE_URL,
        statusCode: response.status,
        message: 'Backend returned an error',
      }, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      backend: 'unreachable',
      backendUrl: API_BASE_URL,
      message: error.message,
      hint: 'Make sure the Express backend is running on ' + API_BASE_URL,
    }, { status: 503 });
  }
}

