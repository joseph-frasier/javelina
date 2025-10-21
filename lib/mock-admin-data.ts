/**
 * Enhanced mock data for admin portal
 * Includes realistic data for testing all Quick Win features
 */

import { v4 as uuidv4 } from 'uuid';

// Generate realistic last login timestamps
function generateLastLogin(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

// Generate mock users with varied activity
export function generateMockUsers(count: number = 50) {
  const names = [
    'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis',
    'Frank Miller', 'Grace Wilson', 'Henry Moore', 'Iris Taylor', 'Jack Anderson',
    'Kate Thomas', 'Liam Jackson', 'Mary White', 'Noah Harris', 'Olivia Martin',
    'Paul Thompson', 'Quinn Garcia', 'Rachel Martinez', 'Steve Robinson', 'Tina Clark',
    'Uma Rodriguez', 'Victor Lewis', 'Wendy Lee', 'Xavier Walker', 'Yara Hall',
    'Zack Allen', 'Amy Young', 'Ben Hernandez', 'Chloe King', 'Daniel Wright',
    'Elena Lopez', 'Felix Hill', 'Gina Scott', 'Hugo Green', 'Ivy Adams',
    'James Baker', 'Kelly Nelson', 'Leo Carter', 'Mia Mitchell', 'Nathan Perez',
    'Oscar Roberts', 'Piper Turner', 'Quinn Phillips', 'Ryan Campbell', 'Sara Parker',
    'Tom Evans', 'Una Edwards', 'Vincent Collins', 'Wanda Stewart', 'Xander Morris'
  ];

  const roles = ['SuperAdmin', 'Admin', 'Editor', 'Viewer'];
  const statuses = ['active', 'disabled'];

  return Array.from({ length: count }, (_, i) => {
    const name = names[i % names.length];
    const email = name.toLowerCase().replace(' ', '.') + '@example.com';
    const daysAgo = i === 0 ? 0 : i < 5 ? Math.random() * 1 : i < 20 ? Math.random() * 7 : Math.random() * 90;
    
    return {
      id: uuidv4(),
      name,
      email,
      status: i % 15 === 0 ? 'disabled' : 'active',
      role: roles[i % roles.length],
      last_login: generateLastLogin(daysAgo),
      created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      organization_members: Array.from(
        { length: Math.floor(Math.random() * 3) + 1 },
        () => ({ organization_id: uuidv4() })
      ),
    };
  });
}

// Generate mock organizations with varied sizes
export function generateMockOrganizations(count: number = 20) {
  const orgNames = [
    'Acme Corp', 'Tech Solutions Inc', 'Digital Dynamics', 'Cloud Systems',
    'Data Innovations', 'Web Services LLC', 'Mobile First', 'AI Ventures',
    'Startup Hub', 'Enterprise Group', 'Global Networks', 'Smart Tech',
    'Future Labs', 'Code Factory', 'Design Studio', 'Product Co',
    'Service Provider', 'Platform Inc', 'Integration Partners', 'Dev Team'
  ];

  return Array.from({ length: count }, (_, i) => {
    const memberCount = i === 0 ? 50 : i < 5 ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 10) + 1;
    const isDeleted = i % 10 === 9;

    return {
      id: uuidv4(),
      name: orgNames[i % orgNames.length],
      description: `Description for ${orgNames[i % orgNames.length]}`,
      created_at: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      deleted_at: isDeleted ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      organization_members: Array.from({ length: memberCount }, () => ({
        organization_id: uuidv4()
      })),
    };
  });
}

// Generate trend data for dashboard
export function generateTrendData() {
  const now = Date.now();
  const lastWeek = now - 7 * 24 * 60 * 60 * 1000;
  const lastMonth = now - 30 * 24 * 60 * 60 * 1000;

  return {
    users: {
      current: 50,
      lastWeek: 47,
      lastMonth: 42,
      weeklyGrowth: ((50 - 47) / 47 * 100).toFixed(1),
      monthlyGrowth: ((50 - 42) / 42 * 100).toFixed(1),
    },
    organizations: {
      current: 18,
      lastWeek: 18,
      lastMonth: 15,
      weeklyGrowth: '0.0',
      monthlyGrowth: ((18 - 15) / 15 * 100).toFixed(1),
    },
    deletedOrgs: {
      current: 2,
      lastWeek: 1,
      lastMonth: 2,
      weeklyGrowth: ((2 - 1) / 1 * 100).toFixed(1),
      monthlyGrowth: '0.0',
    },
    activeMembers: {
      current: 38,
      lastWeek: 35,
      lastMonth: 32,
      weeklyGrowth: ((38 - 35) / 35 * 100).toFixed(1),
      monthlyGrowth: ((38 - 32) / 32 * 100).toFixed(1),
    },
  };
}

// Activity status helper
export function getActivityStatus(lastLogin: string | undefined) {
  if (!lastLogin) return 'inactive';
  
  const now = Date.now();
  const loginTime = new Date(lastLogin).getTime();
  const diffMinutes = (now - loginTime) / (1000 * 60);
  
  if (diffMinutes < 5) return 'online';
  if (diffMinutes < 24 * 60) return 'active';
  if (diffMinutes < 30 * 24 * 60) return 'recent';
  return 'inactive';
}

// Get activity badge props
export function getActivityBadge(status: string) {
  switch (status) {
    case 'online':
      return {
        label: 'Online',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        dotColor: 'bg-green-600',
        animate: true,
      };
    case 'active':
      return {
        label: 'Active',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        dotColor: 'bg-blue-600',
        animate: false,
      };
    case 'recent':
      return {
        label: 'Recent',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400',
        dotColor: 'bg-gray-600',
        animate: false,
      };
    default:
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-500',
        dotColor: 'bg-gray-400',
        animate: false,
      };
  }
}

