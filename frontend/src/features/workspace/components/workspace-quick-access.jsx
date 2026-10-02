import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { workspaceNavigation } from '@/app/workspace-navigation';
import { NavigationQuickAccess } from '@/components/shared/navigation-quick-access';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import {
  getWorkspaceQuickAccessItems,
} from '@/features/workspace/lib/workspace-navigation';

/**
 * Accès rapide aux vues réellement disponibles dans le Workspace courant.
 *
 * Comme côté Platform, ce contrôle ne recherche pas de données métier : il
 * projette seulement les destinations de navigation déjà autorisées.
 */
function WorkspaceQuickAccess({ workspace }) {
  const navigate = useNavigate();
  const { can, hasFeature } = useWorkspaceContext();

  const items = useMemo(
    () => getWorkspaceQuickAccessItems(
      workspaceNavigation,
      { can, hasFeature },
      workspace.id,
    ),
    [can, hasFeature, workspace.id],
  );

  return (
    <NavigationQuickAccess
      ariaLabel="Accès rapide Workspace"
      emptyLabel="Aucune vue disponible dans cet espace."
      items={items}
      noResultsLabel="Aucune vue autorisée ne correspond à cette recherche."
      onSelect={(item) => navigate(item.to)}
      placeholder="Accéder à une vue…"
      sectionLabel="Vues autorisées"
    />
  );
}

export { WorkspaceQuickAccess };
