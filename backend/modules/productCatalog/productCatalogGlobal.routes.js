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
    createCharacteristicController,
    createProductController,
    createVarietyController,
    contributions,
    createVariantController,
    detail,
    dimensions,
    duplicateCheck,
    inspectImport,
    list,
    metadata,
    previewImport,
    reviewContribution,
    updateCategoryController,
    updateCharacteristicController,
    updateCharacteristicStatusController,
    updateCategoryStatusController,
    updateProductController,
    updateProductStatusController,
    updateVariantController,
    updateVarietyController,
    updateVarietyStatusController,
    updateVariantStatusController,
} from './productCatalogGlobal.controller.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from './productCatalogGlobalPermission.registry.js';
import {
    createCategoryBodySchema,
    createCharacteristicBodySchema,
    createGlobalProductBodySchema,
    createVarietyBodySchema,
    createGlobalVariantBodySchema,
    duplicateCheckBodySchema,
    globalCategoryParamsSchema,
    globalImportIdParamsSchema,
    globalProductCharacteristicParamsSchema,
    globalProductIdParamsSchema,
    globalProductVarietyParamsSchema,
    globalProductListQuerySchema,
    globalProductVariantParamsSchema,
    importCommitBodySchema,
    importPreviewBodySchema,
    referenceContributionDecisionBodySchema,
    referenceContributionListQuerySchema,
    referenceContributionParamsSchema,
    updateCategoryBodySchema,
    updateCharacteristicBodySchema,
    updateCategoryStatusBodySchema,
    updateProductBodySchema,
    updateProductStatusBodySchema,
    updateVariantBodySchema,
    updateVarietyBodySchema,
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
    '/duplicate-check',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({ body: duplicateCheckBodySchema }),
    duplicateCheck,
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
    '/contributions',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.READ),
    validateRequest({ query: referenceContributionListQuerySchema }),
    contributions,
);

productCatalogGlobalRouter.post(
    '/contributions/:contributionId/decision',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: referenceContributionParamsSchema,
        body: referenceContributionDecisionBodySchema,
    }),
    reviewContribution,
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

productCatalogGlobalRouter.get(
    '/:productId/dimensions',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.READ),
    validateRequest({ params: globalProductIdParamsSchema }),
    dimensions,
);

productCatalogGlobalRouter.post(
    '/:productId/varieties',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductIdParamsSchema,
        body: createVarietyBodySchema,
    }),
    createVarietyController,
);

productCatalogGlobalRouter.patch(
    '/:productId/varieties/:varietyId',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductVarietyParamsSchema,
        body: updateVarietyBodySchema,
    }),
    updateVarietyController,
);

productCatalogGlobalRouter.patch(
    '/:productId/varieties/:varietyId/status',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductVarietyParamsSchema,
        body: updateProductStatusBodySchema,
    }),
    updateVarietyStatusController,
);

productCatalogGlobalRouter.post(
    '/:productId/characteristics',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductIdParamsSchema,
        body: createCharacteristicBodySchema,
    }),
    createCharacteristicController,
);

productCatalogGlobalRouter.patch(
    '/:productId/characteristics/:characteristicId',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductCharacteristicParamsSchema,
        body: updateCharacteristicBodySchema,
    }),
    updateCharacteristicController,
);

productCatalogGlobalRouter.patch(
    '/:productId/characteristics/:characteristicId/status',
    authorizeApplicationGlobalPermission(PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE),
    validateRequest({
        params: globalProductCharacteristicParamsSchema,
        body: updateProductStatusBodySchema,
    }),
    updateCharacteristicStatusController,
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
