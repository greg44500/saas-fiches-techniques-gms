import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ context: vi.fn() }));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.context,
}));

vi.mock('@/features/process-sheets/pages/process-sheets-page', () => ({
  ProcessSheetsPage: () => <div>Interface de consultation</div>,
}));

import {
  ProcessSheetsRoute,
} from '@/features/process-sheets/components/process-sheets-route';
import {
  PROCESS_SHEET_PERMISSION,
} from '@/features/process-sheets/constants/process-sheet-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

describe('M-006 — barrière frontend de lecture', () => {
  beforeEach(() => {
    mocks.context.mockReturnValue({
      canAll: (permissions) => permissions.every((permission) => [
        PROCESS_SHEET_PERMISSION.READ,
        TECHNICAL_SHEET_PERMISSION.READ,
      ].includes(permission)),
    });
  });

  it('autorise la surface seulement si les deux droits sont présents', () => {
    render(<ProcessSheetsRoute />);
    expect(screen.getByText('Interface de consultation')).toBeInTheDocument();
  });

  it.each([
    [PROCESS_SHEET_PERMISSION.READ],
    [TECHNICAL_SHEET_PERMISSION.READ],
    [],
  ])('masque la surface lorsqu’un droit manque (%s)', (allowedPermission) => {
    const allowed = allowedPermission ? [allowedPermission] : [];
    mocks.context.mockReturnValue({
      canAll: (permissions) => permissions.every(
        (permission) => allowed.includes(permission),
      ),
    });
    render(<ProcessSheetsRoute />);
    expect(screen.getByRole('heading', { name: 'Accès refusé' }))
      .toBeInTheDocument();
    expect(screen.queryByText('Interface de consultation')).not.toBeInTheDocument();
  });
});
