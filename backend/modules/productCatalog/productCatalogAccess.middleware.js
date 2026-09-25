import {
    enforcePlanFeature,
} from '../../middlewares/enforcePlanFeature.js';
import {
    assertEntitlementFeatureAvailable,
} from '../plan/planFeature.service.js';
import { AppError } from '../../utils/appError.js';
import {
    resolveProductImportCommitRequirements,
} from './productCatalogImportAccess.service.js';
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

const enforceProductImportCommitAccess = async (
    req,
    res,
    next,
) => {
    if (
        !req.workspace?._id
        || !req.user?._id
        || !Array.isArray(req.permissions)
    ) {
        return next(
            new AppError(
                'Contexte d’autorisation de l’import indisponible.',
                403,
            ),
        );
    }

    try {
        const requirements =
            await resolveProductImportCommitRequirements({
                workspaceId: req.workspace._id,
                actorId: req.user._id,
                importId:
                    req.validated.params.importId,
                decisions:
                    req.validated.body.decisions,
            });

        const missingPermission =
            requirements.permissions.find(
                (permission) =>
                    !req.permissions.includes(
                        permission,
                    ),
            );

        if (missingPermission) {
            throw new AppError(
                'Permission insuffisante pour confirmer cet import.',
                403,
            );
        }

        for (const featureKey of requirements.features) {
            assertEntitlementFeatureAvailable({
                entitlement:
                    req.effectiveEntitlement,
                featureKey,
            });
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

export {
    enforceProductCatalogImportFeature,
    enforceProductContributionFeature,
    enforceProductImportCommitAccess,
    enforceProductReferenceSearchFeature,
};
