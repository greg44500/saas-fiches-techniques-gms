import { dossiersWorkspaceNavigation } from '@/features/dossiers/dossiers-navigation';
import { productsWorkspaceNavigation } from '@/features/products/products-navigation';
import { suppliersWorkspaceNavigation } from '@/features/suppliers/suppliers-navigation';
import {
  composeWorkspaceNavigation,
} from '@/features/workspace/navigation/compose-workspace-navigation';

/**
 * Point de composition Workspace du produit dérivé.
 *
 * Les fonctions métier sont déclarées ici et restent prioritaires dans la
 * sidebar. Le moteur Core injecte ensuite le séparateur
 * "Administration de l’espace" puis la navigation générique du Workspace.
 */
const APPLICATION_WORKSPACE_NAVIGATION_MODULES = Object.freeze([
  dossiersWorkspaceNavigation,
  productsWorkspaceNavigation,
  suppliersWorkspaceNavigation,
]);

const workspaceNavigation = composeWorkspaceNavigation(
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
);

export {
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  composeWorkspaceNavigation,
  workspaceNavigation,
};
