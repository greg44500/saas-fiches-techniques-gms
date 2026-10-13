import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ correct: vi.fn() }));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCorrectSupplierArticleTariffMutation: () => [
    mocks.correct, { isLoading: false },
  ],
}));

import { SupplierArticlePriceCorrectionDialog } from './supplier-article-price-correction-dialog';

const article = {
  id: 'article-1',
  supplierReference: 'REF-42',
  supplierDesignation: 'Farine fournisseur',
  supplierTariff: {
    id: 'tariff-1',
    sourceAmount: '11.2',
    sourceBasis: 'PACKAGE',
    sourcePriceLabel: '11,200 € HT / carton',
  },
};

describe('SupplierArticlePriceCorrectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.correct.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'tariff-2' }),
    });
  });

  it('corrige un tarif avec motif sans envoyer un prix normalisé calculé par React', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SupplierArticlePriceCorrectionDialog
      article={article}
      onClose={vi.fn()}
      onSaved={onSaved}
      open
      workspaceId="workspace-1"
    />);
    expect(screen.getByText('11,200 € HT / carton')).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Nouveau prix HT' }));
    await user.type(screen.getByRole('textbox', { name: 'Nouveau prix HT' }), '12,50');
    await user.type(screen.getByRole('textbox', { name: 'Motif de la correction' }),
      'Erreur de saisie du tarif précédent');
    await user.click(screen.getByRole('button', { name: 'Enregistrer la correction' }));
    expect(mocks.correct).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      articleId: 'article-1',
      tariffId: 'tariff-1',
      sourceAmount: '12.50',
      sourceBasis: 'PACKAGE',
      reason: 'Erreur de saisie du tarif précédent',
    });
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('n’envoie rien sans motif de correction suffisant', async () => {
    const user = userEvent.setup();
    render(<SupplierArticlePriceCorrectionDialog
      article={article}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    await user.click(screen.getByRole('button', { name: 'Enregistrer la correction' }));
    expect(mocks.correct).not.toHaveBeenCalled();
    expect(screen.getByText(/motif de correction/)).toBeInTheDocument();
  });
});
