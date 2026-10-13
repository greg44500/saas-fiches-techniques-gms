import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  SupplierArticlePackagingPopover,
  SupplierArticlePricePopover,
} from './supplier-article-table-popovers';

describe('M-003 — accès aux détails d’une ligne Article', () => {
  it('donne accès au poids total et au warning au survol', async () => {
    const user = userEvent.setup();
    render(<SupplierArticlePackagingPopover
      presentation={{
        mainLabel: 'Carton · 36 × 0.300 kg',
        totalLabel: 'Poids total calculé : 10,8 kg',
        warningLabel: 'Poids net déclaré à vérifier : 10 800 kg',
      }}
      supplierReference="34171"
    />);

    const trigger = screen.getByRole('button', {
      name: 'Détails du conditionnement de 34171 — poids à vérifier',
    });
    expect(trigger).toHaveClass('text-warning');
    expect(screen.queryByText('Poids total calculé : 10,8 kg')).not.toBeInTheDocument();
    await user.hover(trigger);
    expect(await screen.findByText('Poids total calculé : 10,8 kg')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Poids net déclaré à vérifier : 10 800 kg',
    );
  });

  it('affiche au clavier les prix projetés, puis ferme avec Échap', async () => {
    const user = userEvent.setup();
    render(<SupplierArticlePricePopover
      price={{
        packagePriceLabel: '11,200 € HT / Carton',
        piecePriceLabel: '0,311 € HT / pièce',
        unitPriceLabel: '1,037 € HT / kg',
      }}
      supplierReference="34171"
    />);
    await user.tab();
    expect(screen.getByRole('button', {
      name: 'Détails des prix de 34171',
    })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('0,311 € HT / pièce')).toBeInTheDocument();
    expect(screen.getByText('1,037 € HT / kg')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', {
      name: 'Détails des prix de 34171',
    })).toHaveAttribute('aria-expanded', 'false');
  });

  it('ne propose aucun popover lorsqu’il n’existe aucun détail supplémentaire', () => {
    render(<>
      <SupplierArticlePackagingPopover
        presentation={{ mainLabel: 'Sac de 2 kg', totalLabel: null, warningLabel: null }}
        supplierReference="SAC-1"
      />
      <SupplierArticlePricePopover
        price={{ packagePriceLabel: '10,000 € HT / sac', unitPriceLabel: null }}
        supplierReference="SAC-1"
      />
    </>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
