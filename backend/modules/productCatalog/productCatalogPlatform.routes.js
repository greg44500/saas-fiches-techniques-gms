import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    approveProductController,
    approveVariantController,
    categories,
    createCategoryController,
    detail,
    list,
    metadata,
    rejectProductController,
    rejectVariantController,
    updateCategoryController,
    updateCategoryStatusController,
    updateProductController,
    updateProductStatusController,
    updateVariantController,
    updateVariantStatusController,
} from './productCatalogPlatform.controller.js';
import {
    PRODUCT_CATALOG_PLATFORM_PERMISSION,
} from './productCatalogPlatformPermission.registry.js';
import {
    createCategoryBodySchema,
    platformCategoryParamsSchema,
    platformProductIdParamsSchema,
    platformProductListQuerySchema,
    platformProductVariantParamsSchema,
    rejectProductBodySchema,
    updateCategoryBodySchema,
    updateCategoryStatusBodySchema,
    updateProductBodySchema,
    updateProductStatusBodySchema,
    updateVariantBodySchema,
    updateVariantStatusBodySchema,
} from './productCatalog.validation.js';

const platformProductCatalogRouter = Router();

platformProductCatalogRouter.use(authenticate);

platformProductCatalogRouter.get(
    '/metadata',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.READ),
    metadata,
);

platformProductCatalogRouter.get(
    '/categories',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.READ),
    categories,
);

platformProductCatalogRouter.post(
    '/categories',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({ body: createCategoryBodySchema }),
    createCategoryController,
);

platformProductCatalogRouter.patch(
    '/categories/:categoryId',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformCategoryParamsSchema,
        body: updateCategoryBodySchema,
    }),
    updateCategoryController,
);

platformProductCatalogRouter.patch(
    '/categories/:categoryId/status',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformCategoryParamsSchema,
        body: updateCategoryStatusBodySchema,
    }),
    updateCategoryStatusController,
);

platformProductCatalogRouter.get(
    '/',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.READ),
    validateRequest({ query: platformProductListQuerySchema }),
    list,
);

platformProductCatalogRouter.get(
    '/:productId',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.READ),
    validateRequest({ params: platformProductIdParamsSchema }),
    detail,
);

platformProductCatalogRouter.patch(
    '/:productId',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformProductIdParamsSchema,
        body: updateProductBodySchema,
    }),
    updateProductController,
);

platformProductCatalogRouter.post(
    '/:productId/approve',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({ params: platformProductIdParamsSchema }),
    approveProductController,
);

platformProductCatalogRouter.post(
    '/:productId/reject',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformProductIdParamsSchema,
        body: rejectProductBodySchema,
    }),
    rejectProductController,
);

platformProductCatalogRouter.patch(
    '/:productId/status',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformProductIdParamsSchema,
        body: updateProductStatusBodySchema,
    }),
    updateProductStatusController,
);

platformProductCatalogRouter.patch(
    '/:productId/variants/:variantId',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformProductVariantParamsSchema,
        body: updateVariantBodySchema,
    }),
    updateVariantController,
);

platformProductCatalogRouter.post(
    '/:productId/variants/:variantId/approve',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({ params: platformProductVariantParamsSchema }),
    approveVariantController,
);

platformProductCatalogRouter.post(
    '/:productId/variants/:variantId/reject',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformProductVariantParamsSchema,
        body: rejectProductBodySchema,
    }),
    rejectVariantController,
);

platformProductCatalogRouter.patch(
    '/:productId/variants/:variantId/status',
    authorizePlatformPermission(PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE),
    validateRequest({
        params: platformProductVariantParamsSchema,
        body: updateVariantStatusBodySchema,
    }),
    updateVariantStatusController,
);

export { platformProductCatalogRouter };
