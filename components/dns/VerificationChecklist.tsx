import { formatRelativeTime } from '@/lib/mock-dns-data';

interface VerificationChecklistProps {
  nameservers: string[];
  verificationStatus: 'verified' | 'pending' | 'failed' | 'unverified';
  lastVerifiedAt: string | null;
  observedNameservers?: string[];
}

export function VerificationChecklist({
  nameservers,
  verificationStatus,
  lastVerifiedAt,
  observedNameservers = [],
}: VerificationChecklistProps) {
  // Determine which nameservers are verified
  const verifiedNS = observedNameservers.length > 0 ? observedNameservers : nameservers;
  const allVerified = verificationStatus === 'verified';
  const noneVerified = verificationStatus === 'unverified' || verificationStatus === 'failed';
  
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-light">
        <div>
          <h4 className="text-sm font-medium text-orange-dark">Nameserver Verification</h4>
          {lastVerifiedAt && (
            <p className="text-xs text-gray-slate mt-1">
              Last checked {formatRelativeTime(lastVerifiedAt)}
            </p>
          )}
        </div>
        <div className="text-right">
          {allVerified && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All Verified
            </span>
          )}
          {verificationStatus === 'pending' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking...
            </span>
          )}
          {noneVerified && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Not Verified
            </span>
          )}
        </div>
      </div>

      {/* Expected Nameservers */}
      <div>
        <h5 className="text-xs font-medium text-gray-slate mb-2">Expected Nameservers</h5>
        <div className="space-y-2">
          {nameservers.map((ns, index) => {
            const isVerified = allVerified || verifiedNS.includes(ns);
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-md ${
                  isVerified ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isVerified ? (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={`text-sm font-mono ${isVerified ? 'text-green-800' : 'text-gray-700'}`}>
                    {ns}
                  </span>
                </div>
                {isVerified && (
                  <span className="text-xs text-green-600 font-medium">Verified</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Observed Nameservers (if different) */}
      {observedNameservers.length > 0 && !allVerified && (
        <div>
          <h5 className="text-xs font-medium text-gray-slate mb-2">Observed at Registrar</h5>
          <div className="space-y-1">
            {observedNameservers.map((ns, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-mono text-amber-800">{ns}</span>
                {!nameservers.includes(ns) && (
                  <span className="text-xs text-amber-600 font-medium">Unexpected</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      {!allVerified && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Update your nameservers at your registrar</p>
              <p>Point your domain to the nameservers listed above. This may take up to 48 hours to propagate.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

