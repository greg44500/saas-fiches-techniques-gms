import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const corePlatformNavigationSections = Object.freeze([
  Object.freeze({
    type: 'item',
    id: 'overview',
    label: 'Vue d’ensemble',
    to: '/platform/overview',
    permission: PLATFORM_PERMISSION.OVERVIEW_READ,
  }),
  Object.freeze({
    type: 'group',
    id: 'clients',
    label: 'Gestion clients',
    items: Object.freeze([
      Object.freeze({
        id: 'users',
        label: 'Utilisateurs',
        to: '/platform/users',
        permission: PLATFORM_PERMISSION.USERS_READ,
      }),
      Object.freeze({
        id: 'workspaces',
        label: 'Espaces de travail',
        to: '/platform/workspaces',
        permission: PLATFORM_PERMISSION.WORKSPACES_READ,
      }),
    ]),
  }),
  Object.freeze({
    type: 'group',
    id: 'commercial',
    label: 'Offre commerciale',
    items: Object.freeze([
      Object.freeze({
        id: 'plans',
        label: 'Plans',
        to: '/platform/plans',
        permission: PLATFORM_PERMISSION.PLANS_READ,
      }),
      Object.freeze({
        id: 'subscriptions',
        label: 'Abonnements',
        to: '/platform/subscriptions',
        permission: PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
      }),
      Object.freeze({
        id: 'commercial-invitations',
        label: 'Invitations commerciales',
        to: '/platform/commercial-invitations',
        permission: PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_READ,
      }),
      Object.freeze({
        id: 'entitlement-overrides',
        label: 'Dérogations',
        to: '/platform/entitlement-overrides',
        permission: PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
      }),
    ]),
  }),
  Object.freeze({
    type: 'group',
    id: 'platform-team',
    label: 'Équipe Platform',
    items: Object.freeze([
      Object.freeze({
        id: 'team',
        label: 'Gestion des membres',
        to: '/platform/team',
        anyPermission: Object.freeze([
          PLATFORM_PERMISSION.TEAM_READ,
          PLATFORM_PERMISSION.ROLES_READ,
        ]),
      }),
    ]),
  }),
  Object.freeze({
    type: 'group',
    id: 'security-data',
    label: 'Sécurité & données',
    items: Object.freeze([
      Object.freeze({
        id: 'audit-logs',
        label: 'Journaux d’audit',
        to: '/platform/audit-logs',
        permission: PLATFORM_PERMISSION.AUDIT_LOGS_READ,
      }),
      Object.freeze({
        id: 'retention',
        label: 'Rétention & purge',
        to: '/platform/retention',
        permission: PLATFORM_PERMISSION.RETENTION_READ,
      }),
    ]),
  }),
]);

function getPlatformNavigationItems(navigationSections) {
  return navigationSections.flatMap((entry) => (
    entry.type === 'group' ? entry.items : [entry]
  ));
}

const corePlatformNavigationItems = Object.freeze(
  getPlatformNavigationItems(corePlatformNavigationSections),
);

/**
 * Construit le contexte générique utilisé uniquement pour la visibilité de la
 * navigation. Les permissions Platform et Application Global restent deux
 * autorités distinctes.
 */
function createPlatformNavigationVisibilityContext(platformAccessOrPermissions) {
  if (Array.isArray(platformAccessOrPermissions)) {
    return {
      platformAccess: null,
      platformPermissions: new Set(platformAccessOrPermissions),
      applicationGlobalPermissions: new Set(),
    };
  }

  const platformAccess = (
    platformAccessOrPermissions
    && typeof platformAccessOrPermissions === 'object'
  )
    ? platformAccessOrPermissions
    : null;

  return {
    platformAccess,
    platformPermissions: new Set(
      platformAccess?.platformPermissions
      ?? platformAccess?.permissions
      ?? [],
    ),
    applicationGlobalPermissions: new Set(
      platformAccess?.applicationGlobalPermissions ?? [],
    ),
  };
}

function hasPlatformNavigationVisibilityRule(item) {
  return Boolean(
    item.permission
    || Array.isArray(item.anyPermission)
    || typeof item.isVisible === 'function'
  );
}

function canDisplayPlatformNavigationItem(item, visibilityContextInput) {
  const visibilityContext =
    createPlatformNavigationVisibilityContext(
      visibilityContextInput,
    );

  let hasRule = false;
  let isVisible = true;

  if (item.permission) {
    hasRule = true;
    isVisible = isVisible
      && visibilityContext.platformPermissions.has(item.permission);
  }

  if (Array.isArray(item.anyPermission)) {
    hasRule = true;
    isVisible = isVisible
      && item.anyPermission.some((permission) => (
        visibilityContext.platformPermissions.has(permission)
      ));
  }

  if (typeof item.isVisible === 'function') {
    hasRule = true;
    isVisible = isVisible && item.isVisible(visibilityContext) === true;
  }

  return hasRule && isVisible;
}

function getVisiblePlatformNavigationSections(
  visibilityContextInput,
  navigationSections = corePlatformNavigationSections,
) {
  return navigationSections.flatMap((entry) => {
    if (entry.type !== 'group') {
      return canDisplayPlatformNavigationItem(
        entry,
        visibilityContextInput,
      )
        ? [entry]
        : [];
    }

    if (
      hasPlatformNavigationVisibilityRule(entry)
      && !canDisplayPlatformNavigationItem(
        entry,
        visibilityContextInput,
      )
    ) {
      return [];
    }

    const items = entry.items.filter((item) => (
      canDisplayPlatformNavigationItem(
        item,
        visibilityContextInput,
      )
    ));

    return items.length > 0 ? [{ ...entry, items }] : [];
  });
}

function hasActivePlatformAccess(platformAccess) {
  return platformAccess?.status === 'active'
    && Array.isArray(platformAccess.permissions)
    && platformAccess.permissions.length > 0;
}

function getFirstPlatformDestination(
  platformAccess,
  navigationSections = corePlatformNavigationSections,
) {
  if (!hasActivePlatformAccess(platformAccess)) {
    return null;
  }

  const entries = getVisiblePlatformNavigationSections(
    platformAccess,
    navigationSections,
  );
  const firstEntry = entries[0];

  return firstEntry?.type === 'group'
    ? firstEntry.items[0]?.to ?? null
    : firstEntry?.to ?? null;
}

function getPlatformNavigationItemForPath(
  pathname,
  navigationSections = corePlatformNavigationSections,
) {
  if (typeof pathname !== 'string' || pathname.length === 0) {
    return null;
  }

  const normalizedPathname = pathname.length > 1
    ? pathname.replace(/\/+$/, '')
    : pathname;

  return getPlatformNavigationItems(navigationSections).find(({ to }) => (
    normalizedPathname === to
    || normalizedPathname.startsWith(`${to}/`)
  )) ?? null;
}

function getActivePlatformNavigationGroupId(navigation, pathname) {
  const activeItem = getPlatformNavigationItemForPath(
    pathname,
    navigation,
  );
  if (!activeItem) return null;

  return navigation.find((entry) => (
    entry.type === 'group'
    && entry.items.some((item) => item.id === activeItem.id)
  ))?.id ?? null;
}

function canAccessPlatformPath(
  pathname,
  platformAccess,
  navigationSections = corePlatformNavigationSections,
) {
  if (!hasActivePlatformAccess(platformAccess)) {
    return false;
  }

  const navigationItem = getPlatformNavigationItemForPath(
    pathname,
    navigationSections,
  );

  if (!navigationItem) {
    // Une route Platform qui n'est volontairement pas déclarée dans la
    // navigation conserve son propre guard. Ce guard impose au minimum une
    // appartenance Platform active sans prétendre remplacer l'autorisation de
    // la route métier.
    return true;
  }

  return canDisplayPlatformNavigationItem(
    navigationItem,
    platformAccess,
  );
}

// Alias conservés pour les consommateurs Core existants.
const platformNavigationSections = corePlatformNavigationSections;
const platformNavigationItems = corePlatformNavigationItems;

export {
  canAccessPlatformPath,
  canDisplayPlatformNavigationItem,
  corePlatformNavigationItems,
  corePlatformNavigationSections,
  createPlatformNavigationVisibilityContext,
  getActivePlatformNavigationGroupId,
  getFirstPlatformDestination,
  getPlatformNavigationItemForPath,
  getVisiblePlatformNavigationSections,
  hasActivePlatformAccess,
  platformNavigationItems,
  platformNavigationSections,
};
