import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  TechnicalSheetStatusBadge,
} from '@/features/technical-sheets/components/technical-sheet-status-badge';

describe('TechnicalSheetStatusBadge', () => {
  it('mappe les tons métier M-004 vers les tons du Design System', () => {
    const { rerender } = render(
      <TechnicalSheetStatusBadge tone="warning">
        Brouillon
      </TechnicalSheetStatusBadge>,
    );

    expect(screen.getByText('Brouillon'))
      .toHaveClass('text-warning');

    rerender(
      <TechnicalSheetStatusBadge tone="alert">
        Non valorisée
      </TechnicalSheetStatusBadge>,
    );

    expect(screen.getByText('Non valorisée'))
      .toHaveClass('text-destructive');

    rerender(
      <TechnicalSheetStatusBadge tone="archived">
        Archivée
      </TechnicalSheetStatusBadge>,
    );

    expect(screen.getByText('Archivée'))
      .toHaveClass('text-muted-foreground');
  });
});
