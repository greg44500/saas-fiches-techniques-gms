import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizeApplicationGlobalPermission,
} from '../../middlewares/authorizeApplicationGlobalPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    cleanupProductImportUploadOnError,
    uploadProductImportFile,
} from './productCatalogImport.middleware.js';
import {
    access,
    categories,
    commitImport,
    createCategoryController,
    createProductController,
    createVariantController,
    detail,
    inspectImport,
    list,
    metadata,
    previewImport,
    updateCategoryController,
    updateCategoryStatusController,
    updateProductController,
    updateProductStatusController,
    updateVariantController,
    updateVariantStatusController,
} from './productCatalogGlobal.controller.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from './productCatalogGlobalPermission.registry.js';
import {
    createCategoryBodySchema,
    createGlobalProductBodySchema,
    createGlobalVariantBodySchema,
    globalCategoryParamsSchema,
    globalImportIdParamsSchema,
    globalProductIdParamsSchema,
    globalProductListQuerySchema,
    globalProductVariantParamsSchema,
    importCommitBodySchema,
    importPreviewBodySchema,
    updateCategoryBodySchema,
    updateCategoryStatusBodySchema,
    updateProductBodySchema,
    updateProductStatusBodySchema,
    updateVariantBodySchema,
    updateVariantStatusBodySchema,
} from './productCatalog.validation.js';

const productCatalogGlobalRouter = Router();

productCatalogGlobalRouter.use(authenticate);

productCatalogGlobalRouter.get('/access', access);

productCatalogGlobalRouter.get(
    '/metadata',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.READ),
    metadata,
);

productCatalogGlobalRouter.get(
    '/categories',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.READ),
    categories,
);

productCatalogGlobalRouter.post(
    '/categories',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({ body: createCategoryBodySchema }),
    createCategoryController,
);

productCatalogGlobalRouter.patch(
    '/categories/:categoryId',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalCategoryParamsSchema,
        body: updateCategoryBodySchema,
    }),
    updateCategoryController,
);

productCatalogGlobalRouter.patch(
    '/categories/:categoryId/status',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalCategoryParamsSchema,
        body: updateCategoryStatusBodySchema,
    }),
    updateCategoryStatusController,
);

productCatalogGlobalRouter.post(
    '/imports/inspect',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    uploadProductImportFile,
    inspectImport,
    cleanupProductImportUploadOnError,
);

productCatalogGlobalRouter.post(
    '/imports/:importId/preview',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalImportIdParamsSchema,
        body: importPreviewBodySchema,
    }),
    previewImport,
);

productCatalogGlobalRouter.post(
    '/imports/:importId/commit',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalImportIdParamsSchema,
        body: importCommitBodySchema,
    }),
    commitImport,
);

productCatalogGlobalRouter.get(
    '/',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.READ),
    validateRequest({ query: globalProductListQuerySchema }),
    list,
);

productCatalogGlobalRouter.post(
    '/',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({ body: createGlobalProductBodySchema }),
    createProductController,
);

productCatalogGlobalRouter.get(
    '/:productId',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.READ),
    validateRequest({ params: globalProductIdParamsSchema }),
    detail,
);

productCatalogGlobalRouter.patch(
    '/:productId',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductIdParamsSchema,
        body: updateProductBodySchema,
    }),
    updateProductController,
);

productCatalogGlobalRouter.patch(
    '/:productId/status',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductIdParamsSchema,
        body: updateProductStatusBodySchema,
    }),
    updateProductStatusController,
);

productCatalogGlobalRouter.post(
    '/:productId/variants',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductIdParamsSchema,
        body: createGlobalVariantBodySchema,
    }),
    createVariantController,
);

productCatalogGlobalRouter.patch(
    '/:productId/variants/:variantId',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductVariantParamsSchema,
        body: updateVariantBodySchema,
    }),
    updateVariantController,
);

productCatalogGlobalRouter.patch(
    '/:productId/variants/:variantId/status',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductVariantParamsSchema,
        body: updateVariantStatusBodySchema,
    }),
    updateVariantStatusController,
);

export { productCatalogGlobalRouter };
