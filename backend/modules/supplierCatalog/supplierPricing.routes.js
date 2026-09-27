import { Router } from 'express';

import {
    authenticate,
} from '../../middlewares/authenticate.js';
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
    SUPPLIER_CATALOG_PERMISSION,
} from './supplierCatalogPermission.registry.js';
import {
    addReference,
    applicable,
    archiveNegotiated,
    createInvoiced,
    createNegotiated,
    decideInvoiced,
    getPolicy,
    listInvoiced,
    listNegotiated,
    listReferences,
    metadata,
    removeReference,
    updatePolicy,
} from './supplierPricing.controller.js';
import {
    applicablePriceQuerySchema,
    createInvoicedPriceBodySchema,
    createNegotiatedPriceBodySchema,
    dossierParamsSchema,
    dossierReferenceParamsSchema,
    invoicedPriceDecisionBodySchema,
    invoicedPriceParamsSchema,
    listInvoicedPriceQuerySchema,
    listNegotiatedPriceQuerySchema,
    negotiatedPriceParamsSchema,
    updatePricingPolicyBodySchema,
    workspaceIdParamsSchema,
} from './supplierPricing.validation.js';

const dossierSupplierPricingRouter =
    Router({ mergeParams: true });

const supplierPricingPolicyRouter =
    Router({ mergeParams: true });

const readDossierContext = [
    loadWorkspaceContext,
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
];

const mutateDossierContext = [
    loadWorkspaceContext,
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.UPDATE,
    ),
];

dossierSupplierPricingRouter.get(
    '/metadata',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
    }),
    ...readDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .APPLICABLE_PRICE_READ,
    ),
    metadata,
);

dossierSupplierPricingRouter.get(
    '/negotiated-prices',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
        query:
            listNegotiatedPriceQuerySchema,
    }),
    ...readDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .NEGOTIATED_PRICE_READ,
    ),
    listNegotiated,
);

dossierSupplierPricingRouter.post(
    '/negotiated-prices',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
        body:
            createNegotiatedPriceBodySchema,
    }),
    ...mutateDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .NEGOTIATED_PRICE_MANAGE,
    ),
    createNegotiated,
);

dossierSupplierPricingRouter.patch(
    '/negotiated-prices/:priceId/archive',
    authenticate,
    validateRequest({
        params:
            negotiatedPriceParamsSchema,
    }),
    ...mutateDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .NEGOTIATED_PRICE_MANAGE,
    ),
    archiveNegotiated,
);

dossierSupplierPricingRouter.get(
    '/invoiced-prices',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
        query:
            listInvoicedPriceQuerySchema,
    }),
    ...readDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .INVOICED_PRICE_READ,
    ),
    listInvoiced,
);

dossierSupplierPricingRouter.post(
    '/invoiced-prices',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
        body:
            createInvoicedPriceBodySchema,
    }),
    ...mutateDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .INVOICED_PRICE_MANAGE,
    ),
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
    ...mutateDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .INVOICED_PRICE_VALIDATE,
    ),
    decideInvoiced,
);

dossierSupplierPricingRouter.get(
    '/references',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
    }),
    ...readDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .DOSSIER_REFERENCE_READ,
    ),
    listReferences,
);

dossierSupplierPricingRouter.put(
    '/references/:articleId',
    authenticate,
    validateRequest({
        params:
            dossierReferenceParamsSchema,
    }),
    ...mutateDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .DOSSIER_REFERENCE_MANAGE,
    ),
    addReference,
);

dossierSupplierPricingRouter.delete(
    '/references/:articleId',
    authenticate,
    validateRequest({
        params:
            dossierReferenceParamsSchema,
    }),
    ...mutateDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .DOSSIER_REFERENCE_MANAGE,
    ),
    removeReference,
);

dossierSupplierPricingRouter.get(
    '/applicable',
    authenticate,
    validateRequest({
        params:
            dossierParamsSchema,
        query:
            applicablePriceQuerySchema,
    }),
    ...readDossierContext,
    authorizePermission(
        SUPPLIER_CATALOG_PERMISSION
            .APPLICABLE_PRICE_READ,
    ),
    applicable,
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
    supplierPricingPolicyRouter,
};
