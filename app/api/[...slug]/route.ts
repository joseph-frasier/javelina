/**
 * Catch-all API route that proxies requests to the Express backend
 * This allows the Express app to run as a Vercel serverless function
 * 
 * Matches: /api/* (except specific Next.js routes like /api/admin/set-session)
 */

import serverlessExpress from '@vendia/serverless-express';

// Import and cache the Express app
let serverlessHandler: any;

async function getServerlessHandler() {
  if (!serverlessHandler) {
    // Import the Express app
    const { default: app } = await import('@/../../backend/src/index');
    
    // Create serverless handler
    serverlessHandler = serverlessExpress({ app });
  }
  return serverlessHandler;
}

// Handler for all HTTP methods
async function handler(request: Request) {
  try {
    const handler = await getServerlessHandler();
    return handler(request);
  } catch (error) {
    console.error('Error in serverless Express handler:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;

// Configure runtime for Node.js (required for Express)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

