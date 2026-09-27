import { Router } from 'express';

import {
    authenticate,
} from '../../middlewares/authenticate.js';
import {
    authorizeApplicationGlobalPermission,
} from '../../middlewares/authorizeApplicationGlobalPermission.js';
import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import {
    loadWorkspaceContext,
} from '../../middlewares/loadWorkspaceContext.js';
import {
    validateRequest,
} from '../../middlewares/validateRequest.js';
import {
    cleanupSupplierCatalogImportUploadOnError,
    uploadSupplierCatalogImportFile,
} from './supplierCatalogImport.middleware.js';
import {
    enforceSupplierCatalogImportFeature,
    enforceSupplierImportCommitAccess,
} from './supplierCatalogAccess.middleware.js';
import {
    commitGlobalImport,
    commitWorkspaceImport,
    createGlobalCatalog,
    createWorkspaceCatalog,
    inspectGlobalImport,
    inspectWorkspaceImport,
    listGlobalCatalogLines,
    listGlobalCatalogs,
    listWorkspaceCatalogLines,
    listWorkspaceCatalogs,
    metadata,
    previewGlobalImport,
    previewWorkspaceImport,
    updateGlobalCatalogStatus,
    updateWorkspaceCatalogStatus,
    upsertGlobalCatalogLine,
    upsertWorkspaceCatalogLine,
} from './supplierCatalog.controller.js';
import {
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from './supplierCatalogGlobalPermission.registry.js';
import {
    SUPPLIER_CATALOG_PERMISSION,
} from './supplierCatalogPermission.registry.js';
import {
    catalogLineBodySchema,
    editionBodySchema,
    globalCatalogIdParamsSchema,
    globalImportIdParamsSchema,
    importPreviewBodySchema,
    listCatalogLinesQuerySchema,
    listCatalogQuerySchema,
    updateCatalogStatusBodySchema,
    workspaceCatalogIdParamsSchema,
    workspaceIdParamsSchema,
    workspaceImportIdParamsSchema,
} from './supplierCatalog.validation.js';

const supplierCatalogRouter =
    Router({ mergeParams: true });

const supplierCatalogGlobalRouter =
    Router();

supplierCatalogRouter.post(
    '/imports/inspect',
    authenticate,
    validateRequest({
        params:
            workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_IMPORT,
    ),
    enforceWorkspaceAccessMode(),
    enforceSupplierCatalogImportFeature,
    uploadSupplierCatalogImportFile,
    inspectWorkspaceImport,
    cleanupSupplierCatalogImportUploadOnError,
);

supplierCatalogRouter.post(
    '/imports/:importId/preview',
    authenticate,
    validateRequest({
        params:
            workspaceImportIdParamsSchema,
        body:
            importPreviewBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_IMPORT,
    ),
    enforceWorkspaceAccessMode(),
    enforceSupplierCatalogImportFeature,
    previewWorkspaceImport,
);

supplierCatalogRouter.post(
    '/imports/:importId/commit',
    authenticate,
    validateRequest({
        params:
            workspaceImportIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_IMPORT,
    ),
    enforceWorkspaceAccessMode(),
    enforceSupplierCatalogImportFeature,
    enforceSupplierImportCommitAccess,
    commitWorkspaceImport,
);

supplierCatalogRouter.get(
    '/metadata',
    authenticate,
    validateRequest({
        params:
            workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_READ,
    ),
    metadata,
);

supplierCatalogRouter.get(
    '/',
    authenticate,
    validateRequest({
        params:
            workspaceIdParamsSchema,
        query:
            listCatalogQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_READ,
    ),
    listWorkspaceCatalogs,
);

supplierCatalogRouter.post(
    '/',
    authenticate,
    validateRequest({
        params:
            workspaceIdParamsSchema,
        body:
            editionBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    createWorkspaceCatalog,
);

supplierCatalogRouter.patch(
    '/:catalogId/status',
    authenticate,
    validateRequest({
        params:
            workspaceCatalogIdParamsSchema,
        body:
            updateCatalogStatusBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    updateWorkspaceCatalogStatus,
);

supplierCatalogRouter.get(
    '/:catalogId/lines',
    authenticate,
    validateRequest({
        params:
            workspaceCatalogIdParamsSchema,
        query:
            listCatalogLinesQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_READ,
    ),
    listWorkspaceCatalogLines,
);

supplierCatalogRouter.post(
    '/:catalogId/lines',
    authenticate,
    validateRequest({
        params:
            workspaceCatalogIdParamsSchema,
        body:
            catalogLineBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .CATALOG_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    upsertWorkspaceCatalogLine,
);

supplierCatalogGlobalRouter.use(
    authenticate,
);

supplierCatalogGlobalRouter.post(
    '/imports/inspect',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .MANAGE,
    ),
    uploadSupplierCatalogImportFile,
    inspectGlobalImport,
    cleanupSupplierCatalogImportUploadOnError,
);

supplierCatalogGlobalRouter.post(
    '/imports/:importId/preview',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .MANAGE,
    ),
    validateRequest({
        params:
            globalImportIdParamsSchema,
        body:
            importPreviewBodySchema,
    }),
    previewGlobalImport,
);

supplierCatalogGlobalRouter.post(
    '/imports/:importId/commit',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .MANAGE,
    ),
    validateRequest({
        params:
            globalImportIdParamsSchema,
    }),
    commitGlobalImport,
);

supplierCatalogGlobalRouter.get(
    '/metadata',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .READ,
    ),
    metadata,
);

supplierCatalogGlobalRouter.get(
    '/',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .READ,
    ),
    validateRequest({
        query:
            listCatalogQuerySchema
                .omit({ scope: true }),
    }),
    listGlobalCatalogs,
);

supplierCatalogGlobalRouter.post(
    '/',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .MANAGE,
    ),
    validateRequest({
        body:
            editionBodySchema,
    }),
    createGlobalCatalog,
);

supplierCatalogGlobalRouter.patch(
    '/:catalogId/status',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .MANAGE,
    ),
    validateRequest({
        params:
            globalCatalogIdParamsSchema,
        body:
            updateCatalogStatusBodySchema,
    }),
    updateGlobalCatalogStatus,
);

supplierCatalogGlobalRouter.get(
    '/:catalogId/lines',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .READ,
    ),
    validateRequest({
        params:
            globalCatalogIdParamsSchema,
        query:
            listCatalogLinesQuerySchema,
    }),
    listGlobalCatalogLines,
);

supplierCatalogGlobalRouter.post(
    '/:catalogId/lines',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION
            .MANAGE,
    ),
    validateRequest({
        params:
            globalCatalogIdParamsSchema,
        body:
            catalogLineBodySchema,
    }),
    upsertGlobalCatalogLine,
);

export {
    supplierCatalogGlobalRouter,
    supplierCatalogRouter,
};
