import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  candidates: vi.fn(),
  preview: vi.fn(),
  merge: vi.fn(),
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }) => <>{children}</>,
  SheetContent: ({ children }) => <section>{children}</section>,
  SheetDescription: ({ children }) => <p>{children}</p>,
  SheetHeader: ({ children }) => <header>{children}</header>,
  SheetTitle: ({ children }) => <h2>{children}</h2>,
}));

vi.mock('@/components/shared/confirmation-dialog', () => ({
  ConfirmationDialog: ({
    confirmLabel,
    description,
    errorMessage,
    onCancel,
    onConfirm,
    title,
  }) => (
    <section role="dialog" aria-label={title}>
      <h3>{title}</h3>
      <p>{description}</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <button onClick={onCancel} type="button">Annuler</button>
      <button onClick={onConfirm} type="button">{confirmLabel}</button>
    </section>
  ),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useListProductReferenceMergeCandidatesQuery: mocks.candidates,
  usePreviewProductReferenceVariantMergeMutation: () => [
    mocks.preview,
    { isLoading: false },
  ],
  useMergeProductReferenceVariantsMutation: () => [
    mocks.merge,
    { isLoading: false },
  ],
}));

import {
  ProductVariantMergeDrawer,
} from '@/features/products/components/product-variant-merge-drawer';

const product = {
  id: 'product-1',
  name: 'Amande',
};

const sourceVariant = {
  id: 'variant-source',
  name: 'Amande en poudre blanche',
  governanceStatus: 'APPROVED',
  conservationType: 'SEC',
  referenceUnit: 'KG',
  yieldPercent: 100,
  variety: null,
  characteristics: [],
  processingState: null,
};

const candidate = {
  id: 'variant-candidate',
  name: 'Amande en poudre brute',
  governanceStatus: 'APPROVED',
  status: 'ACTIVE',
  conservationType: 'SEC',
  referenceUnit: 'KG',
  yieldPercent: 100,
  variety: null,
  characteristics: [],
  processingState: null,
  canBeRetained: true,
};

const metadata = {
  conservationTypes: [
    { value: 'SEC', label: 'Sec' },
  ],
  referenceUnits: [
    { value: 'KG', label: 'kg' },
  ],
};

function renderDrawer(overrides = {}) {
  return render(
    <ProductVariantMergeDrawer
      metadata={metadata}
      onClose={vi.fn()}
      onMerged={vi.fn()}
      open
      product={product}
      sourceVariant={sourceVariant}
      {...overrides}
    />,
  );
}

describe('ProductVariantMergeDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.candidates.mockReturnValue({
      data: [candidate],
      isError: false,
      isFetching: false,
    });
  });

  it('recherche côté serveur, compare puis confirme une fusion prévisualisée', async () => {
    const user = userEvent.setup();
    const onMerged = vi.fn();
    const preview = {
      retained: sourceVariant,
      replaced: candidate,
      targetName: 'Poudre d’amandes',
      differences: [{
        field: 'name',
        label: 'Nom',
        retained: sourceVariant.name,
        replaced: candidate.name,
        blocking: false,
      }],
      dependencies: {
        supplierArticles: 2,
        technicalSheetDrafts: 1,
        validatedTechnicalSheets: 3,
      },
      conflicts: [],
      canMerge: true,
      previewFingerprint: 'a'.repeat(64),
    };

    mocks.preview.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(preview),
    });
    mocks.merge.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        retained: {
          ...sourceVariant,
          name: 'Poudre d’amandes',
        },
      }),
    });

    renderDrawer({ onMerged });

    await user.type(
      screen.getByRole('textbox', {
        name: 'Rechercher la seconde Référence',
      }),
      'brute',
    );

    expect(mocks.candidates).toHaveBeenLastCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        variantId: 'variant-source',
        q: 'brute',
        limit: 20,
      }),
      expect.objectContaining({ skip: false }),
    );

    await user.click(screen.getByRole('button', { name: 'Comparer' }));

    const targetName = screen.getByRole('textbox', {
      name: 'Nom après fusion',
    });
    await user.clear(targetName);
    await user.type(targetName, 'Poudre d’amandes');

    await user.click(screen.getByRole('button', {
      name: 'Vérifier la fusion',
    }));

    expect(mocks.preview).toHaveBeenCalledWith({
      productId: 'product-1',
      retainedVariantId: 'variant-source',
      replacedVariantId: 'variant-candidate',
      targetName: 'Poudre d’amandes',
    });

    expect(await screen.findByText('Dépendances concernées'))
      .toBeInTheDocument();
    expect(screen.getByText('Articles fournisseur')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Confirmer la fusion',
    }));
    await user.click(screen.getByRole('button', { name: 'Fusionner' }));

    expect(mocks.merge).toHaveBeenCalledWith({
      productId: 'product-1',
      retainedVariantId: 'variant-source',
      replacedVariantId: 'variant-candidate',
      targetName: 'Poudre d’amandes',
      previewFingerprint: 'a'.repeat(64),
    });
    expect(onMerged).toHaveBeenCalledTimes(1);
  });

  it('permet de conserver la seconde Référence et inverse correctement la source remplacée', async () => {
    const user = userEvent.setup();

    mocks.preview.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        retained: candidate,
        replaced: sourceVariant,
        targetName: candidate.name,
        differences: [],
        dependencies: {},
        conflicts: [],
        canMerge: true,
        previewFingerprint: 'b'.repeat(64),
      }),
    });

    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Comparer' }));
    await user.click(screen.getByRole('radio', {
      name: /Amande en poudre brute/,
    }));
    await user.click(screen.getByRole('button', {
      name: 'Vérifier la fusion',
    }));

    expect(mocks.preview).toHaveBeenCalledWith({
      productId: 'product-1',
      retainedVariantId: 'variant-candidate',
      replacedVariantId: 'variant-source',
      targetName: 'Amande en poudre brute',
    });
  });

  it('affiche les conflits backend et interdit la confirmation', async () => {
    const user = userEvent.setup();

    mocks.preview.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        retained: sourceVariant,
        replaced: candidate,
        targetName: sourceVariant.name,
        differences: [],
        dependencies: {
          indicativePrices: 1,
        },
        conflicts: [{
          code: 'INDICATIVE_PRICE_COLLISION',
          message: 'Un Prix indicatif actif existe déjà.',
        }],
        canMerge: false,
        previewFingerprint: 'c'.repeat(64),
      }),
    });

    renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Comparer' }));
    await user.click(screen.getByRole('button', {
      name: 'Vérifier la fusion',
    }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Un Prix indicatif actif existe déjà.',
    );
    expect(screen.getByRole('button', {
      name: 'Confirmer la fusion',
    })).toBeDisabled();
  });
});
