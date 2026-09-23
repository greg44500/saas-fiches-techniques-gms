import {
    enforcePlanFeature,
} from '../../middlewares/enforcePlanFeature.js';
import {
    PRODUCT_CATALOG_FEATURE,
} from './productCatalogCapability.registry.js';

const enforceReferenceAccessFeature =
    enforcePlanFeature(
        PRODUCT_CATALOG_FEATURE.REFERENCE_ACCESS,
    );

const enforceProductCatalogImportFeature =
    enforcePlanFeature(
        PRODUCT_CATALOG_FEATURE.CATALOG_IMPORT,
    );

const enforceProductContributionFeature =
    enforcePlanFeature(
        PRODUCT_CATALOG_FEATURE.CONTRIBUTION,
    );

/**
 * Mon catalogue reste consultable indépendamment de l'accès commercial au
 * référentiel partagé. La capability n'est vérifiée que pour scope=REFERENCE.
 */
const enforceProductReferenceSearchFeature = (
    req,
    res,
    next,
) => (
    req.validated?.query?.scope === 'REFERENCE'
        ? enforceReferenceAccessFeature(req, res, next)
        : next()
);

export {
    enforceProductCatalogImportFeature,
    enforceProductContributionFeature,
    enforceProductReferenceSearchFeature,
};
