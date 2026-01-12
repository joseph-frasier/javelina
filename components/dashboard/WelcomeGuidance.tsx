'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export function WelcomeGuidance() {
  const steps = [
    {
      number: 1,
      title: 'Buy an Organization',
      description: 'Choose a plan that fits your needs',
    },
    {
      number: 2,
      title: 'Invite Team Members',
      description: 'Add team members with role-based permissions',
    },
    {
      number: 3,
      title: 'Create DNS Zones',
      description: 'Add zones to manage your domains',
    },
    {
      number: 4,
      title: 'Configure Records',
      description: 'Set up A, AAAA, and other DNS records',
    },
  ];

  const features = [
    {
      icon: (
        <svg
          className="w-6 h-6 text-orange"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      title: 'Hierarchical Organization',
      description: 'Structure your DNS with organizations and zones',
    },
    {
      icon: (
        <svg
          className="w-6 h-6 text-blue-electric"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      title: 'Team Collaboration',
      description: 'Invite team members with role-based permissions',
    },
    {
      icon: (
        <svg
          className="w-6 h-6 text-orange"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      title: 'Real-time Updates',
      description: 'Changes propagate instantly across your infrastructure',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Getting Started Checklist */}
      <div>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start space-x-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-slate hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-orange/10 dark:bg-orange/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-orange">
                    {step.number}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-slate dark:text-white">
                  {step.title}
                </h4>
                <p className="text-xs text-gray-slate dark:text-gray-light mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Highlights */}
      <div>
        <h3 className="text-lg font-bold text-orange-dark dark:text-orange mb-4">
          Why Javelina?
        </h3>
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-slate"
            >
              <div className="flex-shrink-0 mt-0.5">{feature.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-slate dark:text-white">
                  {feature.title}
                </h4>
                <p className="text-xs text-gray-slate dark:text-gray-light mt-0.5">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

