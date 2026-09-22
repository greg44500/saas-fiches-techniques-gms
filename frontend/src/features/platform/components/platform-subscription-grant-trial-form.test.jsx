import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformSubscriptionGrantTrialForm } from '@/features/platform/components/platform-subscription-grant-trial-form';

const workspaces = [
  { id: 'workspace-1', name: 'Acme' },
  { id: 'workspace-2', name: 'Beta' },
];

const plans = [
  {
    id: 'plan-trial',
    name: 'Premium',
    status: 'active',
    trialEnabled: true,
  },
  {
    id: 'plan-standard',
    name: 'Standard',
    status: 'active',
    trialEnabled: false,
  },
];

async function chooseOption(user, label, optionName) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

describe('PlatformSubscriptionGrantTrialForm', () => {
  it('soumet les valeurs sélectionnées avec les Select Base UI', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <PlatformSubscriptionGrantTrialForm
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        pending={false}
        plans={plans}
        submitError={null}
        workspaces={workspaces}
      />,
    );

    await chooseOption(user, 'Workspace', 'Beta');
    await chooseOption(user, 'Périodicité', 'Annuelle');
    await user.click(screen.getByRole('button', { name: 'Accorder le trial' }));

    expect(onSubmit).toHaveBeenCalledWith({
      workspaceId: 'workspace-2',
      planId: 'plan-trial',
      billingInterval: 'yearly',
    });
  });

  it('désactive le plan et la soumission sans offre éligible', () => {
    render(
      <PlatformSubscriptionGrantTrialForm
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        pending={false}
        plans={plans.filter((plan) => !plan.trialEnabled)}
        submitError={null}
        workspaces={workspaces}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Accorder le trial' })).toBeDisabled();
    expect(screen.getByText('Aucun plan actif éligible au trial.')).toBeInTheDocument();
  });
});
