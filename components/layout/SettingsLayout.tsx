'use client';

interface SettingsLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
}

export function SettingsLayout({ children, activeSection = 'general', onSectionChange }: SettingsLayoutProps) {

  const sections = [
    { 
      id: 'general', 
      name: 'General Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'billing', 
      name: 'Billing & Subscription',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    { 
      id: 'security', 
      name: 'Security Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    { 
      id: 'audit', 
      name: 'Audit & Compliance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    { 
      id: 'password', 
      name: 'Password & Authentication',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange mb-4 sm:mb-6 md:mb-8">Settings</h1>
        
        {/* Mobile: Horizontal Scrolling Tabs */}
        <div className="md:hidden mb-6 -mx-4 px-4 overflow-x-auto">
          <nav className="flex gap-2 min-w-max pb-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange?.(section.id)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap text-sm ${
                  activeSection === section.id
                    ? 'bg-orange text-white'
                    : 'text-gray-slate dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-light/30'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.name}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Desktop: Sidebar Navigation */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <nav className="space-y-2 sticky top-6">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSectionChange?.(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center whitespace-nowrap ${
                    activeSection === section.id
                      ? 'bg-orange text-white'
                      : 'text-gray-slate dark:text-gray-300 hover:bg-gray-light/30 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0">{section.icon}</span>
                  <span>{section.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

