import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformPlanForm } from '@/features/platform/components/platform-plan-form';

const capabilities = {
  features: ['file_upload', 'team_management', 'audit_logs'],
  featureDefinitions: [
    {
      key: 'file_upload',
      label: 'Téléversement de fichiers',
      metricKeys: ['storage_bytes', 'file_uploads_monthly'],
    },
    {
      key: 'team_management',
      label: 'Gestion d’équipe',
      metricKeys: ['members'],
    },
    {
      key: 'audit_logs',
      label: 'Historique d’activité',
      metricKeys: [],
    },
  ],
  metrics: [
    { key: 'members', definition: {} },
    { key: 'storage_bytes', definition: {} },
    { key: 'file_uploads_monthly', definition: {} },
  ],
};

async function chooseOption(user, combobox, optionName) {
  await user.click(combobox);
  await user.click(await screen.findByRole('option', { name: optionName }));
}

describe('PlatformPlanForm', () => {
  it('crée un payload complet sans demander de clé technique', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByLabelText('Clé technique')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(
      screen.getByRole('switch', {
        name: 'Activer Téléversement de fichiers',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Premium',
      description: null,
      status: 'active',
      isPublic: false,
      displayOrder: 0,
      trialEnabled: false,
      trialDurationDays: null,
      currency: 'EUR',
      priceMonthlyExclTaxMinor: 0,
      priceYearlyExclTaxMinor: 0,
      features: ['file_upload'],
      limits: {
        members: 0,
        storage_bytes: 0,
        file_uploads_monthly: 0,
      },
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('key');
  });

  it('convertit le stockage en octets et construit un trial atomique', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(screen.getByLabelText('Trial disponible'));
    await user.type(screen.getByLabelText('Durée du trial en jours'), '14');
    await user.click(
      screen.getByRole('switch', {
        name: 'Activer Téléversement de fichiers',
      }),
    );
    await chooseOption(
      user,
      screen.getByLabelText('Mode', { selector: '#platform-plan-limit-mode-storage_bytes' }),
      'Plafond',
    );
    await user.type(screen.getByLabelText('Valeur (Mo)'), '100');
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        trialEnabled: true,
        trialDurationDays: 14,
        limits: {
          members: 0,
          storage_bytes: 100 * 1024 * 1024,
          file_uploads_monthly: 0,
        },
      }),
    );
  });

  it('verrouille le statut actif du plan baseline mais laisse son nom modifiable', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="edit"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        plan={{
          id: 'baseline-plan',
          isBaseline: true,
          name: 'Free',
          status: 'active',
          currency: 'EUR',
          priceMonthlyExclTaxMinor: 0,
          priceYearlyExclTaxMinor: 0,
          features: [],
          limits: {
            members: 0,
            storage_bytes: 0,
            file_uploads_monthly: 0,
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Statut')).toBeDisabled();
    await user.clear(screen.getByLabelText('Nom'));
    await user.type(screen.getByLabelText('Nom'), 'Découverte');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Découverte',
        status: 'active',
      }),
    );
  });

  it('refuse une durée de trial invalide avant la mutation', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <PlatformPlanForm
        capabilities={capabilities}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(screen.getByLabelText('Trial disponible'));
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(screen.getByRole('alert')).toHaveTextContent('La durée du trial doit être un nombre entier de jours strictement positif.');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});