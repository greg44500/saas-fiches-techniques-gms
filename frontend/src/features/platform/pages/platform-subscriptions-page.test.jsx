import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { findToastByText } from '@/test/toast-assertions';

const mocks = vi.hoisted(() => ({
  cancelSubscription: vi.fn(),
  grantTrial: vi.fn(),
  resumeSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  useCancelPlatformSubscriptionMutation: vi.fn(),
  useGetPlatformSubscriptionQuery: vi.fn(),
  useGrantPlatformSubscriptionTrialMutation: vi.fn(),
  useListPlatformPlansQuery: vi.fn(),
  useListPlatformSubscriptionsQuery: vi.fn(),
  useListPlatformWorkspacesQuery: vi.fn(),
  useResumePlatformSubscriptionMutation: vi.fn(),
  useUpdatePlatformSubscriptionMutation: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-subscriptions-api', () => ({
  useCancelPlatformSubscriptionMutation: mocks.useCancelPlatformSubscriptionMutation,
  useGetPlatformSubscriptionQuery: mocks.useGetPlatformSubscriptionQuery,
  useGrantPlatformSubscriptionTrialMutation: mocks.useGrantPlatformSubscriptionTrialMutation,
  useListPlatformSubscriptionsQuery: mocks.useListPlatformSubscriptionsQuery,
  useResumePlatformSubscriptionMutation: mocks.useResumePlatformSubscriptionMutation,
  useUpdatePlatformSubscriptionMutation: mocks.useUpdatePlatformSubscriptionMutation,
}));

vi.mock('@/features/platform/api/platform-plans-api', () => ({
  useListPlatformPlansQuery: mocks.useListPlatformPlansQuery,
}));

vi.mock('@/features/platform/api/platform-workspaces-api', () => ({
  useListPlatformWorkspacesQuery: mocks.useListPlatformWorkspacesQuery,
}));

import { PlatformSubscriptionsPage } from '@/features/platform/pages/platform-subscriptions-page';

const subscription = {
  id: '507f1f77bcf86cd799439011',
  workspace: { id: '507f1f77bcf86cd799439012', name: 'Workspace Démo' },
  plan: { id: '507f1f77bcf86cd799439013', key: 'premium', name: 'Premium' },
  kind: 'commercial',
  status: 'active',
  currentPeriodStart: '2026-09-01T00:00:00.000Z',
  currentPeriodEnd: '2026-10-01T00:00:00.000Z',
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  billingInterval: 'monthly',
  currency: 'EUR',
  priceExclTaxMinor: 7900,
  discountType: 'none',
  discountValue: 0,
  discountReason: null,
  discountEndsAt: null,
  manualOverride: false,
  manualOverrideReason: null,
  manualOverrideBy: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function resolvedMutation(mock) {
  mock.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  return [mock, { isLoading: false }];
}

async function chooseSelectOption(user, scope, label, optionName) {
  await user.click(scope.getByRole('combobox', { name: label }));

  // Base UI rend la liste dans un Portal. Son montage peut être différé d'un
  // cycle de rendu : attendre l'option teste le comportement utilisateur réel
  // sans rendre la suite dépendante du timing interne de la primitive.
  await user.click(await screen.findByRole('option', { name: optionName }));
}

function renderPage() {
  return render(
    <ToastProvider>
      <PlatformSubscriptionsPage />
    </ToastProvider>,
  );
}

describe('PlatformSubscriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useListPlatformSubscriptionsQuery.mockReturnValue({
      data: {
        subscriptions: [subscription],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformSubscriptionQuery.mockReturnValue({
      data: subscription,
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListPlatformPlansQuery.mockReturnValue({
      data: { plans: [{ ...subscription.plan, status: 'active', trialEnabled: true }] },
      error: undefined,
      isLoading: false,
    });
    mocks.useListPlatformWorkspacesQuery.mockReturnValue({
      data: { workspaces: [subscription.workspace] },
      error: undefined,
      isLoading: false,
    });
    mocks.useCancelPlatformSubscriptionMutation.mockReturnValue(
      resolvedMutation(mocks.cancelSubscription),
    );
    mocks.useGrantPlatformSubscriptionTrialMutation.mockReturnValue(
      resolvedMutation(mocks.grantTrial),
    );
    mocks.useResumePlatformSubscriptionMutation.mockReturnValue(
      resolvedMutation(mocks.resumeSubscription),
    );
    mocks.useUpdatePlatformSubscriptionMutation.mockReturnValue(
      resolvedMutation(mocks.updateSubscription),
    );
  });

  it('affiche la liste via le tableau partagé', () => {
    renderPage();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Workspace Démo')).toBeInTheDocument();
    expect(within(table).getByText('Premium')).toBeInTheDocument();
    expect(within(table).getByText(/79,00\s*€/)).toBeInTheDocument();
  });

  it('ouvre le détail de la souscription', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));

    expect(screen.getByRole('dialog', { name: 'Workspace Démo' })).toBeInTheDocument();
  });

  it('accorde un trial avec le workspace, le plan et la périodicité sélectionnés', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Accorder un trial' }));
    // L'ouverture du drawer est différée au frame suivant par EntityDetailsDrawer.
    const trialDrawer = await screen.findByRole('dialog', { name: 'Accorder un trial' });
    await chooseSelectOption(user, within(trialDrawer), 'Périodicité', 'Annuelle');
    await user.click(within(trialDrawer).getByRole('button', { name: 'Accorder le trial' }));

    expect(mocks.grantTrial).toHaveBeenCalledWith({
      workspaceId: subscription.workspace.id,
      planId: subscription.plan.id,
      billingInterval: 'yearly',
    });
    expect(await findToastByText('Trial accordé')).toBeInTheDocument();
  });

  it('modifie les conditions commerciales de la souscription', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const detailsDrawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(detailsDrawer).getByRole('button', { name: 'Modifier' }));

    const editDrawer = screen.getByRole('dialog', { name: 'Modifier la souscription' });
    await chooseSelectOption(user, within(editDrawer), 'Type de remise', 'Pourcentage');
    await user.clear(within(editDrawer).getByLabelText('Valeur de la remise'));
    await user.type(within(editDrawer).getByLabelText('Valeur de la remise'), '15');
    await user.type(within(editDrawer).getByLabelText('Motif de la remise'), 'Offre lancement');
    const endDateInput = within(editDrawer).getByLabelText('Fin de la remise');
    await user.type(endDateInput, '31/12/2026');
    await user.tab();
    await user.click(within(editDrawer).getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.updateSubscription).toHaveBeenCalledWith({
      subscriptionId: subscription.id,
      plan: subscription.plan.id,
      billingInterval: 'monthly',
      discountType: 'percentage',
      discountValue: 15,
      discountReason: 'Offre lancement',
      discountEndsAt: '2026-12-31',
      manualOverride: false,
      manualOverrideReason: null,
    });
    expect(await findToastByText('Souscription mise à jour')).toBeInTheDocument();
  });

  it('annule une souscription avec un mode et un motif explicites', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const detailsDrawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(detailsDrawer).getByRole('button', { name: 'Annuler' }));

    const confirmation = screen.getByRole('dialog', { name: 'Annuler la souscription' });
    await chooseSelectOption(user, within(confirmation), 'Prise d’effet', 'Immédiate');
    await user.type(within(confirmation).getByLabelText('Motif'), 'Demande commerciale');
    await user.click(within(confirmation).getByRole('button', { name: 'Confirmer' }));

    expect(mocks.cancelSubscription).toHaveBeenCalledWith({
      subscriptionId: subscription.id,
      mode: 'immediate',
      reason: 'Demande commerciale',
    });
    expect(await findToastByText('Annulation enregistrée')).toBeInTheDocument();
  });

  it('reprend une souscription dont l’annulation est programmée', async () => {
    const user = userEvent.setup();
    mocks.useGetPlatformSubscriptionQuery.mockReturnValue({
      data: { ...subscription, cancelAtPeriodEnd: true },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Voir' }));
    const detailsDrawer = screen.getByRole('dialog', { name: 'Workspace Démo' });
    await user.click(within(detailsDrawer).getByRole('button', { name: 'Reprendre' }));

    const confirmation = screen.getByRole('dialog', { name: 'Reprendre la souscription' });
    await user.click(within(confirmation).getByRole('button', { name: 'Reprendre' }));

    expect(mocks.resumeSubscription).toHaveBeenCalledWith(subscription.id);
    expect(
      await findToastByText('Annulation programmée retirée'),
    ).toBeInTheDocument();
  });
});
