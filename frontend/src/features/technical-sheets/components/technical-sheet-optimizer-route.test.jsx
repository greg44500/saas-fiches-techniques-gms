import {
  render,
  screen,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const access = vi.hoisted(() => ({
  canUpdate: true,
  hasOptimizer: true,
}));

vi.mock(
  '@/features/workspace/components/workspace-context',
  () => ({
    useWorkspaceContext: () => ({
      can: () => access.canUpdate,
      hasFeature: () =>
        access.hasOptimizer,
    }),
  }),
);

vi.mock(
  '@/features/technical-sheets/pages/technical-sheet-optimizer-page',
  () => ({
    TechnicalSheetOptimizerPage: () => (
      <div>Atelier M-005 autorisé</div>
    ),
  }),
);

import {
  TechnicalSheetOptimizerRoute,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-route';

describe(
  'TechnicalSheetOptimizerRoute',
  () => {
    beforeEach(() => {
      access.canUpdate = true;
      access.hasOptimizer = true;
    });

    it('ouvre l’Atelier avec capability et permission update', () => {
      render(
        <TechnicalSheetOptimizerRoute />,
      );

      expect(
        screen.getByText(
          'Atelier M-005 autorisé',
        ),
      ).toBeInTheDocument();
    });

    it('refuse l’accès direct sans capability commerciale', () => {
      access.hasOptimizer = false;

      render(
        <TechnicalSheetOptimizerRoute />,
      );

      expect(
        screen.getByText(
          'Atelier indisponible',
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          'Atelier M-005 autorisé',
        ),
      ).not.toBeInTheDocument();
    });

    it('refuse l’accès direct sans permission update', () => {
      access.canUpdate = false;

      render(
        <TechnicalSheetOptimizerRoute />,
      );

      expect(
        screen.getByText(
          'Atelier indisponible',
        ),
      ).toBeInTheDocument();
    });
  },
);
