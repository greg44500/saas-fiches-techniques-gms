import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TechnicalSheetExportMenu,
} from '@/features/technical-sheets/components/technical-sheet-export-menu';

function renderMenu(props = {}) {
  const onExport = vi.fn();

  render(
    <TooltipProvider>
      <TechnicalSheetExportMenu
        onExport={onExport}
        {...props}
      />
    </TooltipProvider>,
  );

  return { onExport };
}

describe('TechnicalSheetExportMenu', () => {
  it('ouvre les trois formats validés depuis le bouton Exports', async () => {
    const user = userEvent.setup();
    const { onExport } = renderMenu();

    await user.click(
      screen.getByRole('button', {
        name: 'Exports',
      }),
    );

    expect(
      screen.getByRole('button', {
        name: '.pdf',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '.xlsx',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '.csv',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: '.xlsx',
      }),
    );

    expect(onExport)
      .toHaveBeenCalledWith('XLSX');
  });

  it('adapte son libellé accessible sans dupliquer le menu d’export', async () => {
    const user = userEvent.setup();

    renderMenu({
      label: 'Exporter Tartine auvergnate',
      tooltipLabel: 'Exporter',
    });

    const trigger =
      screen.getByRole('button', {
        name: 'Exporter Tartine auvergnate',
      });

    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(
      screen.getByRole('button', {
        name: '.pdf',
      }),
    ).toBeInTheDocument();
  });

  it('désactive l’export sans version validée', () => {
    renderMenu({
      disabledReason:
        'Validez la Fiche technique pour l’exporter',
    });

    expect(
      screen.getByRole('button', {
        name: 'Exports',
      }),
    ).toBeDisabled();
  });
});
