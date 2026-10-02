import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import {
  APPLICATION_PLATFORM_NAVIGATION,
} from '@/app/application-platform-navigation';
import {
  NavigationQuickAccess,
  normalizeNavigationQuickAccessText,
  searchNavigationQuickAccessItems,
} from '@/components/shared/navigation-quick-access';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  getPlatformQuickAccessItems,
} from '@/features/platform/lib/platform-navigation';

const normalizeQuickAccessText = normalizeNavigationQuickAccessText;
const searchPlatformQuickAccessItems = searchNavigationQuickAccessItems;

/**
 * Accès rapide aux vues d'administration réellement autorisées.
 *
 * La recherche reste volontairement limitée aux destinations de navigation :
 * les recherches de données restent dans leurs pages dédiées.
 */
function PlatformQuickAccess() {
  const navigate = useNavigate();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();

  const items = useMemo(
    () => getPlatformQuickAccessItems(
      platformAccess,
      APPLICATION_PLATFORM_NAVIGATION,
    ),
    [platformAccess],
  );

  return (
    <NavigationQuickAccess
      ariaLabel="Accès rapide Platform"
      emptyLabel="Aucune vue d’administration disponible."
      items={items}
      noResultsLabel="Aucune vue autorisée ne correspond à cette recherche."
      onSelect={(item) => navigate(item.to)}
      placeholder="Accéder à une vue…"
      sectionLabel="Vues autorisées"
    />
  );
}

export {
  PlatformQuickAccess,
  normalizeQuickAccessText,
  searchPlatformQuickAccessItems,
};
