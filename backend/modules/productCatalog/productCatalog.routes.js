import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    archive,
    attach,
    commitImport,
    contributeProduct,
    contributeVariant,
    detail,
    duplicateCheck,
    inspectImport,
    metadata,
    previewImport,
    search,
    summary,
} from './productCatalog.controller.js';
import {
    cleanupProductImportUploadOnError,
    uploadProductImportFile,
} from './productCatalogImport.middleware.js';
import {
    enforceProductCatalogImportFeature,
    enforceProductContributionFeature,
    enforceProductReferenceSearchFeature,
} from './productCatalogAccess.middleware.js';
import {
    PRODUCT_CATALOG_PERMISSION,
} from './productCatalogPermission.registry.js';
import {
    createProductContributionBodySchema,
    createVariantContributionBodySchema,
    duplicateCheckBodySchema,
    importCommitBodySchema,
    importIdParamsSchema,
    importPreviewBodySchema,
    productIdParamsSchema,
    productSearchQuerySchema,
    variantIdParamsSchema,
    workspaceIdParamsSchema,
} from './productCatalog.validation.js';

const productCatalogRouter = Router({ mergeParams: true });

productCatalogRouter.get(
    '/metadata',
    authenticate,
    validateRequest({ params: workspaceIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.READ),
    metadata,
);

productCatalogRouter.get(
    '/summary',
    authenticate,
    validateRequest({ params: workspaceIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.READ),
    summary,
);

productCatalogRouter.get(
    '/search',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: productSearchQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.READ),
    enforceProductReferenceSearchFeature,
    search,
);

productCatalogRouter.post(
    '/duplicate-check',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: duplicateCheckBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE),
    enforceProductContributionFeature,
    duplicateCheck,
);

productCatalogRouter.post(
    '/imports/inspect',
    authenticate,
    validateRequest({ params: workspaceIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE),
    enforceWorkspaceAccessMode(),
    enforceProductCatalogImportFeature,
    uploadProductImportFile,
    inspectImport,
    cleanupProductImportUploadOnError,
);

productCatalogRouter.post(
    '/imports/:importId/preview',
    authenticate,
    validateRequest({
        params: importIdParamsSchema,
        body: importPreviewBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE),
    enforceWorkspaceAccessMode(),
    enforceProductCatalogImportFeature,
    previewImport,
);

productCatalogRouter.post(
    '/imports/:importId/commit',
    authenticate,
    validateRequest({
        params: importIdParamsSchema,
        body: importCommitBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE),
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CATALOG_MANAGE),
    enforceWorkspaceAccessMode(),
    enforceProductCatalogImportFeature,
    commitImport,
);

productCatalogRouter.post(
    '/contributions',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: createProductContributionBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE),
    enforceWorkspaceAccessMode(),
    enforceProductContributionFeature,
    contributeProduct,
);

productCatalogRouter.post(
    '/:productId/variants/contributions',
    authenticate,
    validateRequest({
        params: productIdParamsSchema,
        body: createVariantContributionBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE),
    enforceWorkspaceAccessMode(),
    enforceProductContributionFeature,
    contributeVariant,
);

productCatalogRouter.put(
    '/catalog/:variantId',
    authenticate,
    validateRequest({ params: variantIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CATALOG_MANAGE),
    enforceWorkspaceAccessMode(),
    attach,
);

productCatalogRouter.delete(
    '/catalog/:variantId',
    authenticate,
    validateRequest({ params: variantIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.CATALOG_MANAGE),
    enforceWorkspaceAccessMode(),
    archive,
);

productCatalogRouter.get(
    '/:productId',
    authenticate,
    validateRequest({ params: productIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PRODUCT_CATALOG_PERMISSION.READ),
    detail,
);

export { productCatalogRouter };
