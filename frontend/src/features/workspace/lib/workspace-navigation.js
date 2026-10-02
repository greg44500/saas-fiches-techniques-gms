import { compactNavigationSeparators } from '@/components/shared/navigation-separators';

function canDisplayNavigationItem(item, { can, hasFeature }) {
  return (!item.permission || can(item.permission))
    && (!item.feature || hasFeature(item.feature));
}

/**
 * Applique les droits effectifs avant le rendu ou la recherche de navigation.
 * Cette visibilité reste une règle UX : les guards et API restent l'autorité.
 */
function filterWorkspaceNavigation(navigation, access) {
  const filtered = navigation.flatMap((entry) => {
    if (entry.type === 'separator') return [entry];

    if (entry.type !== 'group' && entry.type !== 'section') {
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

function getWorkspaceQuickAccessItems(navigation, access, workspaceId) {
  return filterWorkspaceNavigation(navigation, access)
    .flatMap((entry) => {
      if (entry.type === 'separator') return [];

      if (entry.type === 'group' || entry.type === 'section') {
        return entry.items.map((item) => ({
          ...item,
          groupLabel: entry.label,
          to: `/workspaces/${workspaceId}/${item.path}`,
        }));
      }

      return [{
        ...entry,
        groupLabel: null,
        to: `/workspaces/${workspaceId}/${entry.path}`,
      }];
    });
}

export {
  filterWorkspaceNavigation,
  getActiveNavigationGroupId,
  getWorkspaceQuickAccessItems,
  isNavigationItemActive,
};
