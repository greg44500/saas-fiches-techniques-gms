import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformSubscriptionEditForm } from '@/features/platform/components/platform-subscription-edit-form';

const plan = {
  id: '507f1f77bcf86cd799439013',
  name: 'Premium',
  status: 'active',
};

const subscription = {
  plan,
  billingInterval: 'monthly',
  discountType: 'percentage',
  discountValue: 20,
  discountReason: 'Offre lancement',
  discountEndsAt: '2026-12-31T00:00:00.000Z',
  manualOverride: false,
  manualOverrideReason: null,
};

function renderForm(overrides = {}) {
  const onSubmit = vi.fn();

  render(
    <PlatformSubscriptionEditForm
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      pending={false}
      plans={[plan]}
      subscription={{ ...subscription, ...overrides }}
      submitError={null}
    />,
  );

  return { onSubmit };
}

async function chooseOption(user, label, optionName) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

describe('PlatformSubscriptionEditForm', () => {
  it('soumet une remise temporaire avec une date technique ISO', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    const endDateInput = screen.getByLabelText('Fin de la remise');
    expect(endDateInput).toHaveValue('31/12/2026');

    await user.clear(endDateInput);
    await user.type(endDateInput, '15/01/2027');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith({
      plan: plan.id,
      billingInterval: 'monthly',
      discountType: 'percentage',
      discountValue: 20,
      discountReason: 'Offre lancement',
      discountEndsAt: '2027-01-15',
      manualOverride: false,
      manualOverrideReason: null,
    });
  });

  it('nettoie les données de remise lorsque la remise est retirée', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await chooseOption(user, 'Type de remise', 'Aucune');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith({
      plan: plan.id,
      billingInterval: 'monthly',
      discountType: 'none',
      discountValue: 0,
      discountReason: null,
      discountEndsAt: null,
      manualOverride: false,
      manualOverrideReason: null,
    });
  });
});
