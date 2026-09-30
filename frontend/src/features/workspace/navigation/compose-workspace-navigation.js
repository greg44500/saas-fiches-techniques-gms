import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

const WORKSPACE_ADMINISTRATION_SEPARATOR = Object.freeze({
  id: 'workspace-administration-separator',
  type: 'separator',
  label: 'Administration de l’espace',
});

/**
 * Compose le shell Workspace sans connaître les modules métier.
 *
 * Un produit dérivé place sa valeur métier en premier. Le Core reste regroupé
 * sous une séparation visuelle explicite sans introduire de titre "Métier".
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
    ...applicationEntries,
    WORKSPACE_ADMINISTRATION_SEPARATOR,
    ...coreWorkspaceNavigation,
  ]);
}

export {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
  composeWorkspaceNavigation,
};
