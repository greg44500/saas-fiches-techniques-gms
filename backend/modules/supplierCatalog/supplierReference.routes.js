import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
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
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from './supplierCatalogGlobalPermission.registry.js';
import {
    SUPPLIER_CATALOG_PERMISSION,
} from './supplierCatalogPermission.registry.js';
import {
    access,
    createGlobalArticle,
    createGlobalSupplier,
    createWorkspaceArticle,
    createWorkspaceSupplier,
    listGlobalArticles,
    listGlobalSuppliers,
    listWorkspaceArticles,
    listWorkspaceSuppliers,
    metadata,
    replaceGlobalArticle,
    replaceWorkspaceArticle,
    updateGlobalArticle,
    updateGlobalArticleStatus,
    updateGlobalSupplier,
    updateGlobalSupplierStatus,
    updateWorkspaceArticle,
    updateWorkspaceArticleStatus,
    updateWorkspaceSupplier,
    updateWorkspaceSupplierStatus,
} from './supplierReference.controller.js';
import {
    articleIdParamsSchema,
    createArticleBodySchema,
    createSupplierBodySchema,
    globalArticleIdParamsSchema,
    globalArticleListQuerySchema,
    globalSupplierIdParamsSchema,
    globalSupplierListQuerySchema,
    replaceArticleBodySchema,
    supplierIdParamsSchema,
    updateArticleBodySchema,
    updateArticleStatusBodySchema,
    updateSupplierBodySchema,
    updateSupplierStatusBodySchema,
    workspaceArticleListQuerySchema,
    workspaceIdParamsSchema,
    workspaceSupplierListQuerySchema,
} from './supplierReference.validation.js';

const supplierRouter = Router({ mergeParams: true });
const supplierArticleRouter = Router({ mergeParams: true });
const supplierReferenceGlobalRouter = Router();

supplierRouter.get(
    '/metadata',
    authenticate,
    validateRequest({ params: workspaceIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.SUPPLIER_READ),
    metadata,
);

supplierRouter.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: workspaceSupplierListQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.SUPPLIER_READ),
    listWorkspaceSuppliers,
);

supplierRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: createSupplierBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.SUPPLIER_MANAGE),
    enforceWorkspaceAccessMode(),
    createWorkspaceSupplier,
);

supplierRouter.patch(
    '/:supplierId',
    authenticate,
    validateRequest({
        params: supplierIdParamsSchema,
        body: updateSupplierBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.SUPPLIER_MANAGE),
    enforceWorkspaceAccessMode(),
    updateWorkspaceSupplier,
);

supplierRouter.patch(
    '/:supplierId/status',
    authenticate,
    validateRequest({
        params: supplierIdParamsSchema,
        body: updateSupplierStatusBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.SUPPLIER_MANAGE),
    enforceWorkspaceAccessMode(),
    updateWorkspaceSupplierStatus,
);

supplierArticleRouter.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: workspaceArticleListQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.ARTICLE_READ),
    listWorkspaceArticles,
);

supplierArticleRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: createArticleBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.ARTICLE_MANAGE),
    enforceWorkspaceAccessMode(),
    createWorkspaceArticle,
);

supplierArticleRouter.patch(
    '/:articleId',
    authenticate,
    validateRequest({
        params: articleIdParamsSchema,
        body: updateArticleBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.ARTICLE_MANAGE),
    enforceWorkspaceAccessMode(),
    updateWorkspaceArticle,
);

supplierArticleRouter.patch(
    '/:articleId/status',
    authenticate,
    validateRequest({
        params: articleIdParamsSchema,
        body: updateArticleStatusBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.ARTICLE_MANAGE),
    enforceWorkspaceAccessMode(),
    updateWorkspaceArticleStatus,
);

supplierArticleRouter.post(
    '/:articleId/replacement',
    authenticate,
    validateRequest({
        params: articleIdParamsSchema,
        body: replaceArticleBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(SUPPLIER_CATALOG_PERMISSION.ARTICLE_MANAGE),
    enforceWorkspaceAccessMode(),
    replaceWorkspaceArticle,
);

supplierReferenceGlobalRouter.use(authenticate);

supplierReferenceGlobalRouter.get(
    '/access',
    access,
);

supplierReferenceGlobalRouter.get(
    '/metadata',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
    ),
    metadata,
);

supplierReferenceGlobalRouter.get(
    '/suppliers',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
    ),
    validateRequest({ query: globalSupplierListQuerySchema }),
    listGlobalSuppliers,
);

supplierReferenceGlobalRouter.post(
    '/suppliers',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({ body: createSupplierBodySchema }),
    createGlobalSupplier,
);

supplierReferenceGlobalRouter.patch(
    '/suppliers/:supplierId',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalSupplierIdParamsSchema,
        body: updateSupplierBodySchema,
    }),
    updateGlobalSupplier,
);

supplierReferenceGlobalRouter.patch(
    '/suppliers/:supplierId/status',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalSupplierIdParamsSchema,
        body: updateSupplierStatusBodySchema,
    }),
    updateGlobalSupplierStatus,
);

supplierReferenceGlobalRouter.get(
    '/articles',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
    ),
    validateRequest({ query: globalArticleListQuerySchema }),
    listGlobalArticles,
);

supplierReferenceGlobalRouter.post(
    '/articles',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({ body: createArticleBodySchema }),
    createGlobalArticle,
);

supplierReferenceGlobalRouter.patch(
    '/articles/:articleId',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalArticleIdParamsSchema,
        body: updateArticleBodySchema,
    }),
    updateGlobalArticle,
);

supplierReferenceGlobalRouter.patch(
    '/articles/:articleId/status',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalArticleIdParamsSchema,
        body: updateArticleStatusBodySchema,
    }),
    updateGlobalArticleStatus,
);

supplierReferenceGlobalRouter.post(
    '/articles/:articleId/replacement',
    authorizeApplicationGlobalPermission(
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalArticleIdParamsSchema,
        body: replaceArticleBodySchema,
    }),
    replaceGlobalArticle,
);

export {
    supplierArticleRouter,
    supplierReferenceGlobalRouter,
    supplierRouter,
};
