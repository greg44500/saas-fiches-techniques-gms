import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CommercialInvitationForm } from '@/features/commercial-invitation/components/commercial-invitation-form';

const privateFreePlan = {
  id: '507f1f77bcf86cd799439011',
  name: 'Découverte privée',
  status: 'active',
  isPublic: false,
  isBaseline: false,
  trialEnabled: false,
  trialDurationDays: null,
  currency: 'EUR',
  priceMonthlyExclTaxMinor: 0,
  priceYearlyExclTaxMinor: 0,
  features: ['file_upload'],
  limits: { members: 3 },
};

const publicPlan = {
  ...privateFreePlan,
  id: '507f1f77bcf86cd799439012',
  name: 'Premium public',
  isPublic: true,
};

describe('CommercialInvitationForm', () => {
  it('n’affiche pas les plans publics et soumet la périodicité dérivée gratuite', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CommercialInvitationForm
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        plans={[privateFreePlan, publicPlan]}
      />,
    );

    expect(screen.queryByText(/Premium public/)).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Email du bénéficiaire'),
      'beta@example.com',
    );
    await user.type(
      screen.getByLabelText('Nom du premier workspace'),
      'Beta Workspace',
    );
    await user.click(screen.getByRole('combobox', { name: 'Offre privée' }));
    await user.click(await screen.findByRole('option', { name: /Découverte privée/ }));
    await user.type(
      screen.getByLabelText('Motif administratif'),
      'Programme bêta',
    );
    await user.click(
      screen.getByRole('button', { name: 'Envoyer l’invitation' }),
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    expect(onSubmit.mock.calls[0][0]).toEqual({
      email: 'beta@example.com',
      planId: privateFreePlan.id,
      workspaceName: 'Beta Workspace',
      billingInterval: 'none',
      reason: 'Programme bêta',
    });
  });
});
