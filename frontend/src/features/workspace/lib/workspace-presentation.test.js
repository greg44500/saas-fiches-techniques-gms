import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_STATUS_TONE,
  formatDashboardCount,
  formatWorkspaceStatus,
} from '@/features/workspace/lib/workspace-presentation';

describe('workspace presentation', () => {
  it.each([
    ['active', 'Actif', 'success'],
    ['suspended', 'Suspendu', 'warning'],
    ['archived', 'Archivé', 'neutral'],
    ['closed', 'Clôturé', 'destructive'],
  ])('localise et sémantise le statut %s', (status, label, tone) => {
    expect(formatWorkspaceStatus(status)).toBe(label);
    expect(WORKSPACE_STATUS_TONE[status]).toBe(tone);
  });

  it('formate les compteurs sans inventer une valeur absente', () => {
    expect(formatDashboardCount(1234)).toBe(new Intl.NumberFormat('fr-FR').format(1234));
    expect(formatDashboardCount(null)).toBe('—');
    expect(formatDashboardCount(-1)).toBe('—');
  });
});
