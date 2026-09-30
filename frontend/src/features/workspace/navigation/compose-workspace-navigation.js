import {
  coreWorkspaceAdministrationNavigation,
  coreWorkspaceDashboardNavigationItem,
  coreWorkspaceNavigation,
} from '@/features/workspace/navigation/core-workspace-navigation';

const WORKSPACE_ADMINISTRATION_SEPARATOR = Object.freeze({
  id: 'workspace-administration-separator',
  type: 'separator',
  label: 'Administration de l’espace',
});

/**
 * Compose le shell Workspace sans connaître les modules métier.
 *
 * Le Dashboard reste en tête car il agrège les widgets Core et applicatifs.
 * Les modules applicatifs suivent sans séparation artificielle, puis le Core
 * regroupe ses autres surfaces sous "Administration de l’espace".
 */
function composeWorkspaceNavigation(navigationModules = []) {
  if (!Array.isArray(navigationModules)) {
    throw new TypeError('navigationModules must be an array');
  }

  const applicationEntries = navigationModules.flatMap((moduleDefinition, index) => {
    if (
      moduleDefinition === null
      || Array.isArray(moduleDefinition)
      || typeof moduleDefinition !== 'object'
    ) {
      throw new TypeError(
        `Workspace navigation module at index ${index} must be an object`,
      );
    }

    const groups = moduleDefinition.groups ?? [];

    if (!Array.isArray(groups)) {
      throw new TypeError(
        `navigationModules[${index}].groups must be an array`,
      );
    }

    return groups;
  });

  if (applicationEntries.length === 0) {
    return coreWorkspaceNavigation;
  }

  return Object.freeze([
    coreWorkspaceDashboardNavigationItem,
    ...applicationEntries,
    WORKSPACE_ADMINISTRATION_SEPARATOR,
    ...coreWorkspaceAdministrationNavigation,
  ]);
}

export {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
  composeWorkspaceNavigation,
};
