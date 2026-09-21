import {
  CORE_HELP_FRONTEND_ROUTE_MODULE,
} from '@/features/help/help-routes';
import { dossiersFrontendRouteModule } from '@/features/dossiers/dossiers-routes';

const APPLICATION_ROUTE_COLLECTION_KEYS = Object.freeze([
  'publicRoutes',
  'authenticatedRoutes',
  'workspaceRoutes',
  'platformRoutes',
]);

function assertUniqueFrontendRoutePaths(routes, collectionKey) {
  const registeredPaths = new Set();

  routes.forEach((route) => {
    if (
      route === null
      || Array.isArray(route)
      || typeof route !== 'object'
      || typeof route.path !== 'string'
    ) {
      return;
    }

    if (registeredPaths.has(route.path)) {
      throw new TypeError(
        `Duplicate frontend route path "${route.path}" in ${collectionKey}`,
      );
    }

    registeredPaths.add(route.path);
  });
}

/**
 * Compose les routes déclarées par les modules réellement installés.
 *
 * Le fichier reste indépendant des composants React : chaque module fournit
 * uniquement des objets de route compatibles avec React Router. Le Core ne
 * découvre aucun fichier automatiquement.
 */
function composeApplicationFrontendRoutes(modules = []) {
  if (!Array.isArray(modules)) {
    throw new TypeError('modules must be an array');
  }

  const composedRoutes = Object.fromEntries(
    APPLICATION_ROUTE_COLLECTION_KEYS.map((collectionKey) => [collectionKey, []]),
  );

  modules.forEach((moduleDefinition, moduleIndex) => {
    if (
      moduleDefinition === null
      || Array.isArray(moduleDefinition)
      || typeof moduleDefinition !== 'object'
    ) {
      throw new TypeError(
        `Frontend route module at index ${moduleIndex} must be an object`,
      );
    }

    for (const collectionKey of APPLICATION_ROUTE_COLLECTION_KEYS) {
      const moduleRoutes = moduleDefinition[collectionKey] ?? [];

      if (!Array.isArray(moduleRoutes)) {
        throw new TypeError(
          `modules[${moduleIndex}].${collectionKey} must be an array`,
        );
      }

      composedRoutes[collectionKey].push(...moduleRoutes);
    }
  });

  for (const collectionKey of APPLICATION_ROUTE_COLLECTION_KEYS) {
    assertUniqueFrontendRoutePaths(
      composedRoutes[collectionKey],
      collectionKey,
    );
  }

  return Object.freeze(
    Object.fromEntries(
      APPLICATION_ROUTE_COLLECTION_KEYS.map((collectionKey) => [
        collectionKey,
        Object.freeze([...composedRoutes[collectionKey]]),
      ]),
    ),
  );
}

/**
 * Point d'extension unique des routes du produit dérivé.
 *
 * Le centre d'aide appartient au Core et est composé explicitement avant les
 * modules métier. Les SaaS dérivés ajoutent ensuite leurs routes sans modifier
 * le routeur principal ni découvrir des fichiers automatiquement.
 */
const APPLICATION_FRONTEND_ROUTE_MODULES = Object.freeze([
  dossiersFrontendRouteModule,
]);

const APPLICATION_FRONTEND_ROUTES = composeApplicationFrontendRoutes([
  CORE_HELP_FRONTEND_ROUTE_MODULE,
  ...APPLICATION_FRONTEND_ROUTE_MODULES,
]);

export {
  APPLICATION_FRONTEND_ROUTE_MODULES,
  APPLICATION_FRONTEND_ROUTES,
  composeApplicationFrontendRoutes,
};
