'use client';

import { useState } from 'react';
import { apiClient, organizationsApi, subscriptionsApi, stripeApi } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
  duration?: number;
}

export default function TestApiPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [orgId, setOrgId] = useState('');

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults(prev => {
      const index = prev.findIndex(r => r.name === name);
      if (index === -1) {
        return [...prev, { name, status: 'pending', message: '', ...updates } as TestResult];
      }
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], ...updates };
      return newResults;
    });
  };

  const runTest = async (
    name: string,
    testFn: () => Promise<any>
  ) => {
    updateResult(name, { status: 'pending', message: 'Running...' });
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateResult(name, {
        status: 'success',
        message: 'Success',
        data: result,
        duration,
      });
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateResult(name, {
        status: 'error',
        message: error.message || 'Unknown error',
        data: error,
        duration,
      });
      throw error;
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    try {
      // Test 1: Basic health check (no auth)
      await runTest('Health Check', async () => {
        const response = await fetch('http://localhost:3001/api/health');
        return response.json();
      });

      // Test 2: Database connection (no auth)
      await runTest('Database Connection', async () => {
        const response = await fetch('http://localhost:3001/api/health/db');
        return response.json();
      });

      // Test 3: API client GET (with auth)
      await runTest('API Client - Basic GET', async () => {
        return await apiClient.get('/health');
      });

      // Test 4: Organizations list (requires auth)
      const organizations = await runTest('Organizations API - List', async () => {
        return await organizationsApi.list();
      });

      // Use provided org_id or auto-select most recently created organization
      let testOrgId = orgId;
      if (!testOrgId && organizations && organizations.length > 0) {
        // Sort by created_at descending to get most recent
        const sortedOrgs = [...organizations].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Most recent first
        });
        testOrgId = sortedOrgs[0].id;
        console.log('Auto-selected most recent organization:', {
          id: testOrgId,
          name: sortedOrgs[0].name,
          created_at: sortedOrgs[0].created_at
        });
      }
      
      if (testOrgId) {
        console.log('Testing subscription APIs with org_id:', testOrgId);

        await runTest('Subscriptions API - Get Current', async () => {
          return await subscriptionsApi.getCurrent(testOrgId);
        });

        await runTest('Subscriptions API - Get Status', async () => {
          return await subscriptionsApi.getStatus(testOrgId);
        });
      } else {
        console.warn('No org_id available - skipping subscription tests');
      }

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setTesting(false);
    }
  };

  const testAuthentication = async () => {
    setTesting(true);
    setResults([]);

    // Test that unauthenticated requests fail properly
    await runTest('Auth Test - Unauthenticated Request (should fail)', async () => {
      const response = await fetch('http://localhost:3001/api/organizations', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (response.ok) {
        throw new Error('Request should have failed but succeeded');
      }
      return { status: response.status, data };
    });

    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Client Test Suite</h1>

        {/* Auth Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Authenticated:</span>{' '}
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? '✓ Yes' : '✗ No'}
              </span>
            </p>
            {user && (
              <>
                <p>
                  <span className="font-medium">User ID:</span> {user.id}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {user.email}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                API Base URL: <span className="text-gray-600 font-normal">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</span>
              </label>
            </div>
            <div>
              <label htmlFor="orgId" className="block text-sm font-medium mb-2">
                Organization ID (optional - for subscription tests):
              </label>
              <input
                id="orgId"
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="Enter org ID for subscription tests"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to skip subscription-related tests
              </p>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={runAllTests}
              disabled={testing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Running Tests...' : 'Run All Tests'}
            </button>
            <button
              onClick={testAuthentication}
              disabled={testing}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Auth Failure
            </button>
            <button
              onClick={() => setResults([])}
              disabled={testing}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.status === 'success'
                      ? 'border-green-300 bg-green-50'
                      : result.status === 'error'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {result.status === 'success' && '✓'}
                        {result.status === 'error' && '✗'}
                        {result.status === 'pending' && '⏳'}
                      </span>
                      <div>
                        <h3 className="font-semibold">{result.name}</h3>
                        <p className={`text-sm ${
                          result.status === 'success' ? 'text-green-700' :
                          result.status === 'error' ? 'text-red-700' :
                          'text-gray-700'
                        }`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                    {result.duration && (
                      <span className="text-sm text-gray-500">{result.duration}ms</span>
                    )}
                  </div>

                  {result.data && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        View Response Data
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="flex gap-6">
                <span className="text-green-600">
                  ✓ Passed: {results.filter(r => r.status === 'success').length}
                </span>
                <span className="text-red-600">
                  ✗ Failed: {results.filter(r => r.status === 'error').length}
                </span>
                <span className="text-gray-600">
                  ⏳ Pending: {results.filter(r => r.status === 'pending').length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {results.length === 0 && !testing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">How to Test</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Make sure the backend server is running on <code className="bg-blue-100 px-2 py-1 rounded">localhost:3001</code></li>
              <li>Log in to the application to authenticate</li>
              <li>(Optional) Enter an Organization ID to test subscription APIs</li>
              <li>Click &quot;Run All Tests&quot; to validate API client functionality</li>
              <li>Review results to ensure all tests pass</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

