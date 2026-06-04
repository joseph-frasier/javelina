import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DnsMode = 'javelina' | 'self' | 'skip';

export type ToneOption =
  | 'Friendly'
  | 'Professional'
  | 'Playful'
  | 'Direct'
  | 'Warm'
  | 'Technical';

export type AestheticId = 'bold' | 'simple' | 'playful';

export interface WizardDraft {
  // Step 1 — DNS
  dnsMode: DnsMode | null;
  dnsProvider: string | null;

  // Step 2 — Website
  businessName: string;
  tagline: string;
  description: string;
  tones: ToneOption[];
  aesthetic: AestheticId | null;

  // Step 3 — Domain
  domainQuery: string;
  selectedDomain: string | null;

  // Step 4 — Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  whoisPrivacy: boolean;

  // Meta
  currentStep: number; // 0..4
  completedSteps: number[];
}

interface WizardState extends WizardDraft {
  setField: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  toggleTone: (tone: ToneOption) => void;
  setStep: (step: number) => void;
  next: () => void;
  back: () => void;
  markCompleted: (step: number) => void;
  reset: () => void;
}

const initial: WizardDraft = {
  dnsMode: null,
  dnsProvider: null,
  businessName: '',
  tagline: '',
  description: '',
  tones: [],
  aesthetic: null,
  domainQuery: '',
  selectedDomain: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'US',
  whoisPrivacy: true,
  currentStep: 0,
  completedSteps: [],
};

export const WIZARD_STEP_COUNT = 5;

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initial,
      setField: (key, value) => set({ [key]: value } as Partial<WizardState>),
      toggleTone: (tone) =>
        set((state) => ({
          tones: state.tones.includes(tone)
            ? state.tones.filter((t) => t !== tone)
            : [...state.tones, tone],
        })),
      setStep: (step) =>
        set({
          currentStep: Math.max(0, Math.min(WIZARD_STEP_COUNT - 1, step)),
        }),
      next: () => {
        const { currentStep, completedSteps } = get();
        const nextStep = Math.min(WIZARD_STEP_COUNT - 1, currentStep + 1);
        set({
          currentStep: nextStep,
          completedSteps: completedSteps.includes(currentStep)
            ? completedSteps
            : [...completedSteps, currentStep],
        });
      },
      back: () => {
        const { currentStep } = get();
        set({ currentStep: Math.max(0, currentStep - 1) });
      },
      markCompleted: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'javelina:wizard-draft',
      version: 1,
    }
  )
);
