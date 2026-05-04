// MOCK DATA — replace with real provisioning data once intake-side phase emissions ship.
// See docs/superpowers/specs/2026-05-04-customer-build-progress-design.md

export type MilestoneState = 'pending' | 'running' | 'done' | 'failed';

export interface Milestone {
  id: 'understanding' | 'content' | 'design' | 'building' | 'domain';
  label: string;
  description: string;
  state: MilestoneState;
  startedAt?: string;
  completedAt?: string;
}

export const MOCK_MILESTONES: Milestone[] = [
  {
    id: 'understanding',
    label: 'Understanding your business',
    description: 'Researching your industry, audience, and competitors',
    state: 'done',
    startedAt: '2026-05-04T13:02:00Z',
    completedAt: '2026-05-04T13:04:30Z',
  },
  {
    id: 'content',
    label: 'Writing your content',
    description: 'Generated page-by-page copy for your site',
    state: 'done',
    startedAt: '2026-05-04T13:02:10Z',
    completedAt: '2026-05-04T13:06:50Z',
  },
  {
    id: 'design',
    label: 'Designing your look & feel',
    description: 'Picking a palette and typography from your brand',
    state: 'running',
    startedAt: '2026-05-04T13:02:10Z',
  },
  {
    id: 'building',
    label: 'Building your site',
    description: 'Assembling your pages from copy and design',
    state: 'pending',
  },
  {
    id: 'domain',
    label: 'Connecting your domain',
    description: 'Pointing your domain at your new site',
    state: 'pending',
  },
];
