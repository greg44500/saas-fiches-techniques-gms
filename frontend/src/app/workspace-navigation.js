import { dossiersWorkspaceNavigation } from '@/features/dossiers/dossiers-navigation';
import { productsWorkspaceNavigation } from '@/features/products/products-navigation';
import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

/**
 * Compose les groupes de navigation des modules métier réellement embarqués.
 *
 * Le composant Sidebar reste générique. L'application dérivée importe ici les
 * descriptors de navigation de ses modules et les ajoute à la collection
 * applicative, sans modifier le composant de navigation du Core.
 */
function composeWorkspaceNavigation(navigationModules = []) {
  if (!Array.isArray(navigationModules)) {
    throw new TypeError('navigationModules must be an array');
  }

  const applicationGroups = navigationModules.flatMap((moduleDefinition, index) => {
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

  return Object.freeze([
    ...coreWorkspaceNavigation,
    ...applicationGroups,
  ]);
}

/**
 * Point de composition de la navigation Workspace du produit dérivé.
 *
 * Exemple :
 *
 * const APPLICATION_WORKSPACE_NAVIGATION_MODULES = Object.freeze([
 *   catalogWorkspaceNavigation,
 * ]);
 */
const APPLICATION_WORKSPACE_NAVIGATION_MODULES = Object.freeze([
  dossiersWorkspaceNavigation,
  productsWorkspaceNavigation,
]);

const workspaceNavigation = composeWorkspaceNavigation(
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
);

export {
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  composeWorkspaceNavigation,
  workspaceNavigation,
};
