import { dossiersWorkspaceNavigation } from '@/features/dossiers/dossiers-navigation';
import { productsWorkspaceNavigation } from '@/features/products/products-navigation';
import { suppliersWorkspaceNavigation } from '@/features/suppliers/suppliers-navigation';
import {
  composeWorkspaceNavigation,
} from '@/features/workspace/navigation/compose-workspace-navigation';

/**
 * Point de composition Workspace du produit dérivé.
 *
 * Le moteur Core conserve le Tableau de bord en tête, place ensuite les
 * modules métier puis l'administration générique de l'espace. La surface
 * Fichiers reste techniquement disponible dans le Core mais n'est pas exposée
 * comme entrée principale dans ce produit.
 */
const APPLICATION_WORKSPACE_NAVIGATION_MODULES = Object.freeze([
  dossiersWorkspaceNavigation,
  productsWorkspaceNavigation,
  suppliersWorkspaceNavigation,
]);

const workspaceNavigation = Object.freeze(
  composeWorkspaceNavigation(
    APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  ).filter(({ id }) => id !== 'files'),
);

export {
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  composeWorkspaceNavigation,
  workspaceNavigation,
};
