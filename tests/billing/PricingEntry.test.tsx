import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PricingContent from '@/app/pricing/PricingContent';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock GSAP to avoid animation issues in tests
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
  },
}));

// Mock stores
vi.mock('@/lib/subscription-store', () => ({
  useSubscriptionStore: (selector: any) => {
    const store = {
      selectPlan: vi.fn(),
    };
    return selector ? selector(store) : store;
  },
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: any) => {
    const store = {
      isAuthenticated: true, // User is logged in for this test
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };
    return selector ? selector(store) : store;
  },
}));

vi.mock('@/lib/toast-store', () => ({
  useToastStore: (selector: any) => {
    const store = {
      addToast: vi.fn(),
    };
    return selector ? selector(store) : store;
  },
}));

// Mock the fetchPlans function to avoid database calls
vi.mock('@/lib/plans-config', async () => {
  const actual = await vi.importActual('@/lib/plans-config');
  return {
    ...actual,
    fetchPlans: vi.fn().mockResolvedValue(undefined),
    // Use actual PLANS_CONFIG so we have real plan data to test against
  };
});

// Mock the AddOrganizationModal component
vi.mock('@/components/modals/AddOrganizationModal', () => ({
  AddOrganizationModal: ({ isOpen, onSuccess, selectedPlan }: any) => {
    if (!isOpen) return null;
    
    // Automatically trigger success after a tick to simulate org creation
    return (
      <div data-testid="org-modal">
        <h2>Create Organization</h2>
        <button
          onClick={() => onSuccess('org-created-123')}
          data-testid="create-org-button"
        >
          Create Organization
        </button>
      </div>
    );
  },
}));

// Mock PricingCard to simplify rendering
vi.mock('@/components/stripe/PricingCard', () => ({
  PricingCard: ({ plan, onSelect }: any) => (
    <div data-testid={`plan-card-${plan.id}`}>
      <h3>{plan.name}</h3>
      <p>${plan.price}</p>
      <button onClick={() => onSelect(plan.id)} data-testid={`select-${plan.id}`}>
        Choose {plan.name}
      </button>
    </div>
  ),
}));

// Mock Logo component
vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div>Javelina Logo</div>,
}));

// Mock Breadcrumb component
vi.mock('@/components/ui/Breadcrumb', () => ({
  Breadcrumb: () => <div>Breadcrumb</div>,
}));

describe('Pricing Entry Point - Billing Flow', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders pricing plans and initiates checkout flow when a plan is selected', async () => {
    const user = userEvent.setup();

    // Step 1: Render the pricing page
    render(<PricingContent />);

    // Step 2: Wait for plans to load (fetchPlans is mocked to resolve immediately)
    await waitFor(() => {
      expect(screen.queryByText('Loading pricing plans...')).not.toBeInTheDocument();
    });

    // Step 3: Verify pricing page content is visible
    expect(screen.getByText(/Pricing Plans|Choose Your Plan/i)).toBeInTheDocument();

    // Step 4: Verify at least one plan card is visible
    // PLANS_CONFIG has starter, professional, business plans (non-enterprise)
    // Let's look for "Professional" which is typically a common plan name
    await waitFor(() => {
      const planCards = screen.getAllByTestId(/^plan-card-/);
      expect(planCards.length).toBeGreaterThan(0);
    });

    // Find a specific plan to select (use "pro_lifetime" which we can see exists)
    const proLifetimeCard = screen.getByTestId('plan-card-pro_lifetime');
    expect(proLifetimeCard).toBeInTheDocument();
    expect(proLifetimeCard).toHaveTextContent('Pro Lifetime');

    // Step 5: Click the "Choose Plan" button for Pro Lifetime plan
    const selectButton = screen.getByTestId('select-pro_lifetime');
    await user.click(selectButton);

    // Step 6: Verify organization modal appears
    await waitFor(() => {
      expect(screen.getByTestId('org-modal')).toBeInTheDocument();
    });
    const createOrgText = screen.getAllByText('Create Organization');
    expect(createOrgText.length).toBeGreaterThan(0);

    // Step 7: Complete organization creation
    const createOrgButton = screen.getByTestId('create-org-button');
    await user.click(createOrgButton);

    // Step 8: Verify router.push was called with checkout URL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    // Step 9: Verify the checkout URL contains expected parameters
    const checkoutUrl = mockPush.mock.calls[0][0];
    expect(checkoutUrl).toContain('/checkout');
    expect(checkoutUrl).toContain('org_id=org-created-123');
    expect(checkoutUrl).toContain('plan_code=');
    expect(checkoutUrl).toContain('price_id=');
    expect(checkoutUrl).toContain('plan_name=');
    expect(checkoutUrl).toContain('plan_price=');
    expect(checkoutUrl).toContain('billing_interval=');

    // Step 10: Verify modal closes after navigation
    await waitFor(() => {
      expect(screen.queryByTestId('org-modal')).not.toBeInTheDocument();
    });
  });
});
