import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorkspaceStatusBadge } from '@/features/workspace/components/workspace-status-badge';

describe('WorkspaceStatusBadge', () => {
  it.each([
    ['active', 'Actif', 'text-success'],
    ['suspended', 'Suspendu', 'text-warning'],
    ['archived', 'Archivé', 'text-muted-foreground'],
    ['closed', 'Clôturé', 'text-destructive'],
  ])('rend %s avec son libellé et son ton', (status, label, className) => {
    render(<WorkspaceStatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(className);
  });
});
