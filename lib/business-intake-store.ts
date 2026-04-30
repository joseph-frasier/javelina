import { create } from 'zustand';

export type BusinessPlanCode = 'business_starter' | 'business_pro';

export interface LogoAsset {
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

export interface PhotoAsset {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

export interface BusinessIntakeData {
  orgId: string;
  planCode: BusinessPlanCode;
  currentStep: 0 | 1 | 2 | 3 | 4;
  dns: { mode: 'jbp' | 'self' | 'skip'; provider?: string };
  website: {
    bizName: string;
    bizType: string;
    industry: string;
    tagline: string;
    description: string;
    services: string;
    pages: string[];
    logo: LogoAsset | null;
    photos: PhotoAsset[];
    tone: string;
    aesthetic: 'bold' | 'simple' | 'choose';
    customColor?: string;
    customSecondaryColor?: string;
    customFont?: string;
    letUsWrite: boolean;
  };
  domain: {
    mode: 'transfer' | 'connect' | 'register';
    domain?: string;
    epp?: string;
    registrar?: string;
    unlocked?: boolean;
    search?: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    org?: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    whois: boolean;
  };
  completedAt: string | null;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

interface StoreState {
  intakes: Record<string, BusinessIntakeData>;
  get: (orgId: string) => BusinessIntakeData | null;
  init: (orgId: string, planCode: BusinessPlanCode, bizName: string) => void;
  update: (orgId: string, patch: DeepPartial<BusinessIntakeData>) => void;
  setStep: (orgId: string, step: number) => void;
  complete: (orgId: string) => void;
}

function defaults(orgId: string, planCode: BusinessPlanCode, bizName: string): BusinessIntakeData {
  return {
    orgId,
    planCode,
    currentStep: 0,
    dns: { mode: 'jbp' },
    website: {
      bizName,
      bizType: '',
      industry: '',
      tagline: '',
      description: '',
      services: '',
      pages: ['Home', 'Services', 'Contact'],
      logo: null,
      photos: [],
      tone: 'Friendly',
      aesthetic: 'simple',
      letUsWrite: true,
    },
    domain: { mode: 'connect' },
    contact: {
      firstName: '', lastName: '',
      email: '', phone: '',
      address: '', city: '', state: '', zip: '',
      whois: true,
    },
    completedAt: null,
  };
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base !== 'object' || base === null) return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const current = (base as Record<string, unknown>)[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && typeof current === 'object' && current !== null) {
      out[k] = deepMerge(current, v as DeepPartial<unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function clampStep(n: number): 0 | 1 | 2 | 3 | 4 {
  if (n < 0) return 0;
  if (n > 4) return 4;
  return n as 0 | 1 | 2 | 3 | 4;
}

export const useBusinessIntakeStore = create<StoreState>()((set, get) => ({
  intakes: {},
  get: (orgId) => get().intakes[orgId] ?? null,
  init: (orgId, planCode, bizName) =>
    set((s) => {
      if (s.intakes[orgId]) return s;
      return { intakes: { ...s.intakes, [orgId]: defaults(orgId, planCode, bizName) } };
    }),
  update: (orgId, patch) =>
    set((s) => {
      const curr = s.intakes[orgId];
      if (!curr) return s;
      return { intakes: { ...s.intakes, [orgId]: deepMerge(curr, patch) } };
    }),
  setStep: (orgId, step) =>
    set((s) => {
      const curr = s.intakes[orgId];
      if (!curr) return s;
      return {
        intakes: {
          ...s.intakes,
          [orgId]: { ...curr, currentStep: clampStep(step) },
        },
      };
    }),
  complete: (orgId) =>
    set((s) => {
      const curr = s.intakes[orgId];
      if (!curr) return s;
      return {
        intakes: {
          ...s.intakes,
          [orgId]: { ...curr, completedAt: new Date().toISOString() },
        },
      };
    }),
}));
