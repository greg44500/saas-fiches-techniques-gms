import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ merge: vi.fn() }));
vi.mock('@/features/products/api/product-reference-api', () => ({
  useMergeProductReferenceCategoriesMutation: () => [
    mocks.merge,
    { isLoading: false },
  ],
}));

import { ProductReferenceCategoryMergeDialog } from '@/features/products/components/product-reference-category-merge-dialog';

const source = {
  id: 'source-id', name: 'Légumes anciens',
  status: 'ARCHIVED', totalProductCount: 3,
};
const categories = [
  source,
  { id: 'target-id', name: 'Légumes', status: 'ACTIVE', totalProductCount: 4 },
  { id: 'archived-id', name: 'Archives', status: 'ARCHIVED', totalProductCount: 0 },
];

describe('ProductReferenceCategoryMergeDialog', () => {
  it('ne propose que les cibles actives distinctes et empêche de fusionner sans choix', async () => {
    const user = userEvent.setup();
    const onMerged = vi.fn();
    mocks.merge.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        sourceCategoryId: 'source-id',
        target: { id: 'target-id', name: 'Légumes' },
        movedProductCount: 3,
      }),
    });
    render(
      <ProductReferenceCategoryMergeDialog
        categories={categories}
        onClose={vi.fn()}
        onMerged={onMerged}
        source={source}
      />,
    );

    expect(screen.getByText(/Catégorie à fusionner/)).toHaveTextContent('Légumes anciens');
    expect(screen.getByRole('button', { name: 'Fusionner' })).toBeDisabled();

    const trigger = screen.getByRole('combobox', { name: 'Catégorie à conserver' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({
      x: 10, y: 10, width: 300, height: 36,
    }));
    await user.click(trigger);
    expect(await screen.findByRole('option', { name: 'Légumes' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Archives' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Légumes anciens' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Légumes' }));
    await user.click(screen.getByRole('button', { name: 'Fusionner' }));
    await waitFor(() => {
      expect(mocks.merge).toHaveBeenCalledWith({
        sourceCategoryId: 'source-id', targetCategoryId: 'target-id',
      });
    });
    expect(onMerged).toHaveBeenCalledWith(expect.objectContaining({
      movedProductCount: 3,
    }));
  });
});
