'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Zone {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  zones: Zone[];
}

interface Organization {
  id: string;
  name: string;
  projects: Project[];
}

// Mock data
const mockOrganizations: Organization[] = [
  {
    id: 'acme-corp',
    name: 'Acme Corp',
    projects: [
      {
        id: 'production',
        name: 'Production',
        zones: [
          { id: 'acme-com', name: 'acme.com' },
          { id: 'api-acme-com', name: 'api.acme.com' },
        ],
      },
      {
        id: 'staging',
        name: 'Staging',
        zones: [{ id: 'staging-acme-com', name: 'staging.acme.com' }],
      },
    ],
  },
  // {
  //   id: 'personal-projects',
  //   name: 'Personal Projects',
  //   projects: [
  //     {
  //       id: 'blog',
  //       name: 'Blog',
  //       zones: [{ id: 'blog-example-com', name: 'blog.example.com' }],
  //     },
  //   ],
  // },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set(['acme-corp']));
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['production']));

  const toggleOrg = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  return (
    <aside
      className={`bg-white dark:bg-orange-dark border-r border-gray-light transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } h-screen sticky top-0 flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-light flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="font-bold text-orange-dark dark:text-white">Organizations</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-light rounded-md transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-slate"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
            />
          </svg>
        </button>
      </div>

      {/* Add Organization Button */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-light">
          <button
            disabled
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-light text-gray-slate rounded-md cursor-not-allowed opacity-50"
            title="Add Organization (Coming Soon)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm">Add Organization</span>
          </button>
        </div>
      )}

      {/* Tree View */}
      <nav className="flex-1 overflow-y-auto p-4">
        {isCollapsed ? (
          // Collapsed view - show icons only
          <div className="flex flex-col space-y-2">
            {mockOrganizations.map((org) => (
              <Link
                key={org.id}
                href={`/organization/${org.id}`}
                className="p-2 hover:bg-gray-light rounded-md transition-colors flex items-center justify-center"
                title={org.name}
              >
                <svg
                  className="w-5 h-5 text-gray-slate"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          // Expanded view - show full tree
          <div className="space-y-1">
            {mockOrganizations.map((org) => (
              <div key={org.id}>
                {/* Organization */}
                <div className="flex items-center group">
                  <button
                    onClick={() => toggleOrg(org.id)}
                    className="p-1 hover:bg-gray-light rounded transition-colors"
                    aria-label={expandedOrgs.has(org.id) ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      className={`w-4 h-4 text-gray-slate transition-transform ${
                        expandedOrgs.has(org.id) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <Link
                    href={`/organization/${org.id}`}
                    className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-light rounded flex-1 transition-colors group-hover:text-orange"
                  >
                    <svg
                      className="w-4 h-4 text-orange"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-orange-dark dark:text-white">
                      {org.name}
                    </span>
                  </Link>
                </div>

                {/* Projects */}
                {expandedOrgs.has(org.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {org.projects.map((project) => (
                      <div key={project.id}>
                        <div className="flex items-center group">
                          <button
                            onClick={() => toggleProject(project.id)}
                            className="p-1 hover:bg-gray-light rounded transition-colors"
                            aria-label={expandedProjects.has(project.id) ? 'Collapse' : 'Expand'}
                          >
                            <svg
                              className={`w-4 h-4 text-gray-slate transition-transform ${
                                expandedProjects.has(project.id) ? 'rotate-90' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          <Link
                            href={`/project/${project.id}`}
                            className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-light rounded flex-1 transition-colors group-hover:text-orange"
                          >
                            <svg
                              className="w-4 h-4 text-blue-electric"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                              />
                            </svg>
                            <span className="text-sm text-gray-slate">{project.name}</span>
                          </Link>
                        </div>

                        {/* Zones */}
                        {expandedProjects.has(project.id) && (
                          <div className="ml-4 mt-1 space-y-1">
                            {project.zones.map((zone) => (
                              <Link
                                key={zone.id}
                                href={`/zone/${zone.id}`}
                                className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-light rounded transition-colors group"
                              >
                                <svg
                                  className="w-4 h-4 text-gray-slate group-hover:text-orange"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="text-sm text-gray-slate group-hover:text-orange">
                                  {zone.name}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}

