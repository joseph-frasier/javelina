// MOCK DATA — for scaffolded sidebar pages. Replace with real data once the
// corresponding APIs are wired up.

export const MOCK_DEPLOYS = [
  { id: 'd_4729', commit: 'feat: hero copy refresh', status: 'live' as const, when: '2 hours ago' },
  { id: 'd_4715', commit: 'fix: footer alignment', status: 'live' as const, when: 'Yesterday' },
  { id: 'd_4702', commit: 'chore: bump dependencies', status: 'live' as const, when: '3 days ago' },
];

export const MOCK_PAGES = [
  { name: 'Home', path: '/', words: 412, updated: '2 hours ago' },
  { name: 'About', path: '/about', words: 228, updated: '2 hours ago' },
  { name: 'Services', path: '/services', words: 537, updated: '2 hours ago' },
  { name: 'Contact', path: '/contact', words: 96, updated: '2 hours ago' },
];

export const MOCK_DNS_RECORDS = [
  { type: 'A', name: '@', value: '76.76.21.21', ttl: '3600' },
  { type: 'AAAA', name: '@', value: '2606:4700::1111', ttl: '3600' },
  { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com', ttl: '3600' },
  { type: 'MX', name: '@', value: '10 mx.javelina.app', ttl: '3600' },
  { type: 'TXT', name: '@', value: 'v=spf1 include:_spf.javelina.app ~all', ttl: '3600' },
  { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@javelina.app', ttl: '3600' },
];

export const MOCK_DOMAINS = [
  {
    name: 'acmebusiness.com',
    status: 'active' as const,
    registered: '2026-04-22',
    expires: '2027-04-22',
    autoRenew: true,
    primary: true,
  },
  {
    name: 'acmebusiness.net',
    status: 'active' as const,
    registered: '2026-04-22',
    expires: '2027-04-22',
    autoRenew: true,
    primary: false,
  },
];

export const MOCK_TRAFFIC = {
  visitors: { value: 1284, delta: 18.4 },
  pageviews: { value: 4127, delta: 12.1 },
  avgSession: { value: '2m 14s', delta: -3.2 },
  bounceRate: { value: '38%', delta: -5.7 },
};

export const MOCK_TOP_PAGES = [
  { path: '/', views: 1842, share: 44.6 },
  { path: '/services', views: 904, share: 21.9 },
  { path: '/about', views: 612, share: 14.8 },
  { path: '/contact', views: 487, share: 11.8 },
  { path: '/blog/getting-started', views: 282, share: 6.9 },
];

export const MOCK_TRAFFIC_SOURCES = [
  { source: 'Google search', share: 52.3 },
  { source: 'Direct', share: 24.6 },
  { source: 'Referrals', share: 13.1 },
  { source: 'Social', share: 7.2 },
  { source: 'Other', share: 2.8 },
];

export const MOCK_INVOICES = [
  { id: 'inv_1029', date: '2026-05-01', amount: '$99.88', status: 'paid' as const },
  { id: 'inv_1018', date: '2026-04-01', amount: '$99.88', status: 'paid' as const },
  { id: 'inv_1007', date: '2026-03-01', amount: '$99.88', status: 'paid' as const },
];
