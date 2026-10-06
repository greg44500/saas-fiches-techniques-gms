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
    loadAuthorizedDossierContext,
} from '../dossier/dossierAccess.middleware.js';
import {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
} from '../dossier/dossierState.middleware.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../productCatalog/productCatalogGlobalPermission.registry.js';
import {
    SUPPLIER_CATALOG_PERMISSION,
} from './supplierCatalogPermission.registry.js';
import {
    addReference,
    applicable,
    archiveDossierIndicative,
    archiveGlobalIndicative,
    archiveNegotiated,
    archiveWorkspaceIndicative,
    createInvoiced,
    createNegotiated,
    decideInvoiced,
    getPolicy,
    listDossierIndicative,
    listGlobalIndicative,
    listInvoiced,
    listNegotiated,
    listReferences,
    listWorkspaceIndicative,
    listWorkspaceGlobalIndicative,
    metadata,
    removeReference,
    setDossierIndicative,
    setGlobalIndicative,
    setWorkspaceIndicative,
    updatePolicy,
} from './supplierPricing.controller.js';
import {
    applicablePriceQuerySchema,
    createInvoicedPriceBodySchema,
    createNegotiatedPriceBodySchema,
    dossierIndicativePriceScopeParamsSchema,
    dossierParamsSchema,
    globalIndicativePriceScopeParamsSchema,
    dossierReferenceParamsSchema,
    indicativePriceBodySchema,
    indicativePriceScopeParamsSchema,
    invoicedPriceDecisionBodySchema,
    invoicedPriceParamsSchema,
    listIndicativePriceQuerySchema,
    listInvoicedPriceQuerySchema,
    listNegotiatedPriceQuerySchema,
    negotiatedPriceParamsSchema,
    updatePricingPolicyBodySchema,
    workspaceIdParamsSchema,
} from './supplierPricing.validation.js';

const dossierSupplierPricingRouter =
    Router({ mergeParams: true });

const globalIndicativePricingRouter = Router();

const supplierPricingPolicyRouter =
    Router({ mergeParams: true });

const workspaceSupplierPricingRouter =
    Router({ mergeParams: true });

const readDossierScope = [
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
];

const mutableDossierScope = [
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.UPDATE,
    ),
];

globalIndicativePricingRouter.use(authenticate);

globalIndicativePricingRouter.get(
    '/indicative-prices',
    authorizeApplicationGlobalPermission(
        PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
    ),
    validateRequest({
        query: listIndicativePriceQuerySchema,
    }),
    listGlobalIndicative,
);

globalIndicativePricingRouter.put(
    '/indicative-prices/:productVariantId',
    authorizeApplicationGlobalPermission(
        PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalIndicativePriceScopeParamsSchema,
        body: indicativePriceBodySchema,
    }),
    setGlobalIndicative,
);

globalIndicativePricingRouter.delete(
    '/indicative-prices/:productVariantId',
    authorizeApplicationGlobalPermission(
        PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ),
    validateRequest({
        params: globalIndicativePriceScopeParamsSchema,
    }),
    archiveGlobalIndicative,
);

dossierSupplierPricingRouter.get(
    '/metadata',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .APPLICABLE_PRICE_READ,
    ),
    ...readDossierScope,
    metadata,
);

dossierSupplierPricingRouter.get(
    '/negotiated-prices',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
        query:
            listNegotiatedPriceQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .NEGOTIATED_PRICE_READ,
    ),
    ...readDossierScope,
    listNegotiated,
);

dossierSupplierPricingRouter.post(
    '/negotiated-prices',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
        body:
            createNegotiatedPriceBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .NEGOTIATED_PRICE_MANAGE,
    ),
    ...mutableDossierScope,
    createNegotiated,
);

dossierSupplierPricingRouter.patch(
    '/negotiated-prices/:priceId/archive',
    authenticate,
    validateRequest({
        params:
            negotiatedPriceParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .NEGOTIATED_PRICE_MANAGE,
    ),
    ...mutableDossierScope,
    archiveNegotiated,
);

dossierSupplierPricingRouter.get(
    '/invoiced-prices',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
        query:
            listInvoicedPriceQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .INVOICED_PRICE_READ,
    ),
    ...readDossierScope,
    listInvoiced,
);

dossierSupplierPricingRouter.post(
    '/invoiced-prices',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
        body:
            createInvoicedPriceBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .INVOICED_PRICE_MANAGE,
    ),
    ...mutableDossierScope,
    createInvoiced,
);

dossierSupplierPricingRouter.patch(
    '/invoiced-prices/:priceId/status',
    authenticate,
    validateRequest({
        params:
            invoicedPriceParamsSchema,
        body:
            invoicedPriceDecisionBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .INVOICED_PRICE_VALIDATE,
    ),
    ...mutableDossierScope,
    decideInvoiced,
);

dossierSupplierPricingRouter.get(
    '/references',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .DOSSIER_REFERENCE_READ,
    ),
    ...readDossierScope,
    listReferences,
);

dossierSupplierPricingRouter.put(
    '/references/:articleId',
    authenticate,
    validateRequest({
        params:
            dossierReferenceParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .DOSSIER_REFERENCE_MANAGE,
    ),
    ...mutableDossierScope,
    addReference,
);

dossierSupplierPricingRouter.delete(
    '/references/:articleId',
    authenticate,
    validateRequest({
        params:
            dossierReferenceParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .DOSSIER_REFERENCE_MANAGE,
    ),
    ...mutableDossierScope,
    removeReference,
);

dossierSupplierPricingRouter.get(
    '/indicative-prices',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
        query: listIndicativePriceQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_READ,
    ),
    ...readDossierScope,
    listDossierIndicative,
);

dossierSupplierPricingRouter.put(
    '/indicative-prices/:productVariantId',
    authenticate,
    validateRequest({
        params: dossierIndicativePriceScopeParamsSchema,
        body: indicativePriceBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_MANAGE,
    ),
    ...mutableDossierScope,
    setDossierIndicative,
);

dossierSupplierPricingRouter.delete(
    '/indicative-prices/:productVariantId',
    authenticate,
    validateRequest({
        params: dossierIndicativePriceScopeParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_MANAGE,
    ),
    ...mutableDossierScope,
    archiveDossierIndicative,
);

dossierSupplierPricingRouter.get(
    '/applicable',
    authenticate,
    validateRequest({
        params: dossierParamsSchema,
        query:
            applicablePriceQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .APPLICABLE_PRICE_READ,
    ),
    ...readDossierScope,
    applicable,
);

workspaceSupplierPricingRouter.get(
    '/global-indicative-prices',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: listIndicativePriceQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_READ,
    ),
    listWorkspaceGlobalIndicative,
);

workspaceSupplierPricingRouter.get(
    '/indicative-prices',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: listIndicativePriceQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_READ,
    ),
    listWorkspaceIndicative,
);

workspaceSupplierPricingRouter.put(
    '/indicative-prices/:productVariantId',
    authenticate,
    validateRequest({
        params: indicativePriceScopeParamsSchema,
        body: indicativePriceBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    setWorkspaceIndicative,
);

workspaceSupplierPricingRouter.delete(
    '/indicative-prices/:productVariantId',
    authenticate,
    validateRequest({
        params: indicativePriceScopeParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION.INDICATIVE_PRICE_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    archiveWorkspaceIndicative,
);

supplierPricingPolicyRouter.get(
    '/',
    authenticate,
    validateRequest({
        params:
            workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .APPLICABLE_PRICE_READ,
    ),
    getPolicy,
);

supplierPricingPolicyRouter.put(
    '/',
    authenticate,
    validateRequest({
        params:
            workspaceIdParamsSchema,
        body:
            updatePricingPolicyBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .PRICE_POLICY_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    updatePolicy,
);

export {
    dossierSupplierPricingRouter,
    globalIndicativePricingRouter,
    supplierPricingPolicyRouter,
    workspaceSupplierPricingRouter,
};
