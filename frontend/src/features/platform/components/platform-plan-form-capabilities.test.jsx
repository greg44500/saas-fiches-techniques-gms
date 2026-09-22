import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformPlanForm } from '@/features/platform/components/platform-plan-form';


describe('PlatformPlanForm dynamic capabilities', () => {
  it('affiche une feature métier avec switch et aide contextuelle puis permet de l’inclure', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <PlatformPlanForm
        capabilities={{
          features: ['price_history'],
          featureDefinitions: [
            {
              key: 'price_history',
              label: 'Historique des prix',
              description: 'Consulter les évolutions de prix.',
              category: 'products',
              categoryLabel: 'Produits',
              displayOrder: 10,
              tags: ['reporting'],
              metricKeys: [],
            },
          ],
          metrics: [],
        }}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByText('Fonctionnalités et limites incluses par défaut'),
    ).toBeInTheDocument();
    expect(screen.getByText('Produits')).toBeInTheDocument();
    expect(screen.queryByLabelText('Clé technique')).not.toBeInTheDocument();

    const infoButton = screen.getByRole('button', {
      name: 'Informations sur Historique des prix',
    });

    await user.hover(infoButton);

    expect(
      await screen.findByText('Consulter les évolutions de prix.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nom'), 'Premium');
    await user.click(
      screen.getByRole('switch', {
        name: 'Activer Historique des prix',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Créer le plan' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        features: ['price_history'],
        limits: {},
      }),
    );
  });

  it('déplie les quotas avec le switch puis conserve leur configuration après repli', async () => {
    const user = userEvent.setup();

    render(
      <PlatformPlanForm
        capabilities={{
          features: ['file_upload'],
          featureDefinitions: [
            {
              key: 'file_upload',
              label: 'Téléversement de fichiers',
              category: 'files',
              categoryLabel: 'Fichiers',
              displayOrder: 10,
              metricKeys: [
                'storage_bytes',
                'file_uploads_monthly',
              ],
            },
          ],
          metrics: [
            {
              key: 'storage_bytes',
              presentation: {
                label: 'Stockage',
                category: 'files',
                categoryLabel: 'Fichiers',
                unit: 'bytes',
              },
            },
            {
              key: 'file_uploads_monthly',
              presentation: {
                label: 'Téléversements mensuels',
                category: 'files',
                categoryLabel: 'Fichiers',
                unit: 'count',
              },
            },
          ],
        }}
        mode="create"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const filesGroup = screen.getByRole('group', { name: 'Fichiers' });
    const uploadSwitch = within(filesGroup).getByRole('switch', {
      name: 'Activer Téléversement de fichiers',
    });
    const storageMode = within(filesGroup).getByLabelText('Mode', {
      selector: '#platform-plan-limit-mode-storage_bytes',
    });

    expect(storageMode).toBeDisabled();

    await user.click(uploadSwitch);

    expect(storageMode).toBeEnabled();
    await user.click(storageMode);
    await user.click(await screen.findByRole('option', { name: 'Plafond' }));

    const storageValue = within(filesGroup).getByLabelText('Valeur (Mo)');
    await user.type(storageValue, '500');
    expect(storageValue).toHaveValue(500);

    await user.click(
      within(filesGroup).getByRole('switch', {
        name: 'Désactiver Téléversement de fichiers',
      }),
    );

    expect(storageMode).toBeDisabled();
    expect(storageValue).toBeDisabled();
    expect(storageValue).toHaveValue(500);

    await user.click(
      within(filesGroup).getByRole('switch', {
        name: 'Activer Téléversement de fichiers',
      }),
    );

    expect(storageMode).toBeEnabled();
    expect(storageValue).toBeEnabled();
    expect(storageValue).toHaveValue(500);
  });
});
