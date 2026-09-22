import { describe, expect, it } from 'vitest';

import { APPLICATION_FRONTEND_ROUTES } from '@/app/application-routes';
import { workspaceNavigation } from '@/app/workspace-navigation';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import { filterWorkspaceNavigation } from '@/features/workspace/components/workspace-sidebar';

function hasDossiersNavigation(navigation) {
  return navigation.some((entry) => entry.id === 'dossiers');
}

describe('dossiers frontend composition', () => {
  it('injecte les routes liste et contexte Dossier dans la surface Workspace', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'dossiers' }),
        expect.objectContaining({ path: 'dossiers/:dossierId' }),
      ]),
    );
  });

  it('masque la navigation sans dossier:read', () => {
    expect(hasDossiersNavigation(filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: () => false,
        hasFeature: () => true,
      },
    ))).toBe(false);
  });

  it('affiche la navigation avec dossier:read sans capability commerciale M-001', () => {
    expect(hasDossiersNavigation(filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: (permission) => permission === DOSSIER_PERMISSION.READ,
        hasFeature: () => false,
      },
    ))).toBe(true);
  });
});
