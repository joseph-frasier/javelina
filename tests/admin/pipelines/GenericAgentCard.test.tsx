import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenericAgentCard } from '@/app/admin/pipelines/_components/AgentCards/GenericAgentCard';

describe('GenericAgentCard', () => {
  it('renders "Not yet generated" when data is null', () => {
    render(<GenericAgentCard agentName="Scout" field="research_report" data={null} />);
    expect(screen.getByText(/not yet generated/i)).toBeInTheDocument();
  });

  it('renders nested object keys', () => {
    render(
      <GenericAgentCard
        agentName="Scout"
        field="research_report"
        data={{ summary: 'A small B2B SaaS.', size: { employees: 12, revenue_band: 'sub-$1M' } }}
      />
    );
    expect(screen.getByText('summary')).toBeInTheDocument();
    expect(screen.getByText('A small B2B SaaS.')).toBeInTheDocument();
    expect(screen.getByText('size')).toBeInTheDocument();
    expect(screen.getByText('employees')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders array items inside an object', () => {
    render(
      <GenericAgentCard
        agentName="Strategist"
        field="upsell_risk_report"
        data={{ risks: ['churn', 'price'] }}
      />
    );
    expect(screen.getByText('risks')).toBeInTheDocument();
    expect(screen.getByText('churn')).toBeInTheDocument();
    expect(screen.getByText('price')).toBeInTheDocument();
  });

  it('toggles raw JSON view', async () => {
    const user = userEvent.setup();
    render(
      <GenericAgentCard agentName="Scout" field="research_report" data={{ a: 1 }} />
    );
    expect(screen.queryByText('"a": 1', { exact: false })).toBeNull();
    await user.click(screen.getByRole('button', { name: /view raw json/i }));
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });
});
