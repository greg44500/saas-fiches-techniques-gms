import { useLocation } from 'react-router';

import { APPLICATION_IDENTITY } from '@/app/application-identity';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { compactNavigationSeparators } from '@/components/shared/navigation-separators';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function canDisplayNavigationItem(item, { can, hasFeature }) {
  return (!item.permission || can(item.permission))
    && (!item.feature || hasFeature(item.feature));
}

/**
 * Applique les droits effectifs avant le rendu. Cette visibilité reste une
 * règle UX : l'autorisation de sécurité demeure imposée par les guards et API.
 */
function filterWorkspaceNavigation(navigation, access) {
  const filtered = navigation.flatMap((entry) => {
    if (entry.type === 'separator') {
      return [entry];
    }

    if (entry.type !== 'group') {
      return canDisplayNavigationItem(entry, access) ? [entry] : [];
    }

    const items = (entry.items ?? []).filter((item) => (
      canDisplayNavigationItem(item, access)
    ));

    return items.length > 0 ? [{ ...entry, items }] : [];
  });

  return compactNavigationSeparators(filtered);
}

function isNavigationItemActive({ item, pathname, workspaceId }) {
  const target = `/workspaces/${workspaceId}/${item.path}`;
  return pathname === target || pathname.startsWith(`${target}/`);
}

function getActiveNavigationGroupId({ navigation, pathname, workspaceId }) {
  return navigation.find((entry) => (
    entry.type === 'group'
    && entry.items.some((item) => (
      isNavigationItemActive({ item, pathname, workspaceId })
    ))
  ))?.id ?? null;
}

function WorkspaceSidebar({ navigation = [], workspace }) {
  const location = useLocation();
  const { can, hasFeature } = useWorkspaceContext();
  const visibleNavigation = filterWorkspaceNavigation(navigation, { can, hasFeature });
  const getHref = (item) => `/workspaces/${workspace.id}/${item.path}`;
  const isItemActive = (item) => isNavigationItemActive({
    item,
    pathname: location.pathname,
    workspaceId: workspace.id,
  });

  return (
    <AppSidebar
      eyebrow="Application"
      getHref={getHref}
      getIcon={(entry) => entry.Icon}
      isItemActive={isItemActive}
      navigation={visibleNavigation}
      navigationLabel="Navigation du workspace"
      pathname={location.pathname}
      title={APPLICATION_IDENTITY.name}
    />
  );
}

export {
  WorkspaceSidebar,
  filterWorkspaceNavigation,
  getActiveNavigationGroupId,
  isNavigationItemActive,
};
