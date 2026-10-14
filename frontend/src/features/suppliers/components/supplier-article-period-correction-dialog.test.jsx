import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ correct: vi.fn() }));
vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCorrectSupplierArticleTariffPeriodMutation: () => [mocks.correct, { isLoading: false }],
}));
import { SupplierArticlePeriodCorrectionDialog } from './supplier-article-period-correction-dialog';

const article = {
  id: 'article-1',
  supplierReference: '34171',
  supplierDesignation: 'Plaque 300 g',
  supplierTariff: {
    id: 'tariff-1',
    sourceAmount: '11.2',
    validFrom: '2026-10-13T00:00:00.000Z',
    validTo: '2026-10-14T00:00:00.000Z',
  },
};

describe('SupplierArticlePeriodCorrectionDialog', () => {
  beforeEach(() => {
    mocks.correct.mockReset();
    mocks.correct.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ revision: 2 }) });
  });

  it('propose les dates existantes, les corrige en conservant le montant côté backend', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SupplierArticlePeriodCorrectionDialog
      article={article} open onClose={vi.fn()} onSaved={onSaved}
      workspaceId="workspace-1"
    />);
    const start = screen.getByRole('textbox', { name: 'Début de validité' });
    const end = screen.getByRole('textbox', { name: 'Fin de validité (facultative)' });
    expect(start).toHaveValue('13/10/2026');
    expect(end).toHaveValue('14/10/2026');
    await user.clear(end);
    await user.type(end, '31/12/2026');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Enregistrer la période' }));
    expect(mocks.correct).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      articleId: 'article-1',
      tariffId: 'tariff-1',
      validFrom: '2026-10-13',
      validTo: '2026-12-31',
      reason: null,
    });
    expect(onSaved).toHaveBeenCalledOnce();
  });
});
