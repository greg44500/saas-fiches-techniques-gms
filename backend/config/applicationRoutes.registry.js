import { dossierRouter } from '../modules/dossier/dossier.routes.js';

const ROUTE_MODULE_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;


const assertApplicationRouteModule = (moduleDefinition, index) => {
    if (
        moduleDefinition === null
        || Array.isArray(moduleDefinition)
        || typeof moduleDefinition !== 'object'
    ) {
        throw new TypeError(
            `Application route module at index ${index} must be an object`,
        );
    }

    const {
        key,
        mountPath,
        router,
    } = moduleDefinition;

    if (
        typeof key !== 'string'
        || !ROUTE_MODULE_KEY_PATTERN.test(key)
    ) {
        throw new TypeError(
            `Application route module at index ${index} has an invalid key`,
        );
    }

    if (
        typeof mountPath !== 'string'
        || !mountPath.startsWith('/api/')
        || mountPath.length <= '/api/'.length
    ) {
        throw new TypeError(
            `Application route module "${key}" has an invalid mountPath`,
        );
    }

    if (typeof router !== 'function') {
        throw new TypeError(
            `Application route module "${key}" requires an Express router`,
        );
    }
};


/**
 * Compose les routers métier explicitement installés dans l'application.
 *
 * L'application dérivée ne modifie pas backend/app.js pour chaque nouveau
 * domaine. Elle importe le router de son module dans ce fichier et ajoute un
 * descriptor à APPLICATION_BACKEND_ROUTE_MODULES.
 */
const mountApplicationRoutes = (
    app,
    routeModules = APPLICATION_BACKEND_ROUTE_MODULES,
) => {
    if (!app || typeof app.use !== 'function') {
        throw new TypeError('A valid Express application is required');
    }

    if (!Array.isArray(routeModules)) {
        throw new TypeError('routeModules must be an array');
    }

    const registeredKeys = new Set();
    const registeredMountPaths = new Set();

    routeModules.forEach((moduleDefinition, index) => {
        assertApplicationRouteModule(moduleDefinition, index);

        const {
            key,
            mountPath,
            router,
        } = moduleDefinition;

        if (registeredKeys.has(key)) {
            throw new TypeError(
                `Duplicate application route module key: ${key}`,
            );
        }

        if (registeredMountPaths.has(mountPath)) {
            throw new TypeError(
                `Duplicate application route mountPath: ${mountPath}`,
            );
        }

        registeredKeys.add(key);
        registeredMountPaths.add(mountPath);
        app.use(mountPath, router);
    });

    return app;
};


/**
 * Point de composition applicatif. Le Core reste vide de routes métier.
 *
 * Exemple après dérivation :
 *
 * import { catalogRouter } from '../modules/catalog/catalog.routes.js';
 *
 * const APPLICATION_BACKEND_ROUTE_MODULES = Object.freeze([
 *     Object.freeze({
 *         key: 'catalog',
 *         mountPath: '/api/workspaces/:workspaceId/catalog',
 *         router: catalogRouter,
 *     }),
 * ]);
 */
const APPLICATION_BACKEND_ROUTE_MODULES = Object.freeze([
    Object.freeze({
        key: 'dossiers',
        mountPath: '/api/workspaces/:workspaceId/dossiers',
        router: dossierRouter,
    }),
]);


export {
    APPLICATION_BACKEND_ROUTE_MODULES,
    mountApplicationRoutes,
};
