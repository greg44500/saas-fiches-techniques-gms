import mongoose from 'mongoose';

import {
    enforcePlanFeature,
} from '../../middlewares/enforcePlanFeature.js';
import { AppError } from '../../utils/appError.js';
import {
    SupplierCatalogImportSession,
} from './supplierCatalog.model.js';
import {
    SUPPLIER_CATALOG_FEATURE,
} from './supplierCatalogCapability.registry.js';
import {
    SUPPLIER_CATALOG_PERMISSION,
} from './supplierCatalogPermission.registry.js';
import {
    SUPPLIER_CATALOG_IMPORT_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';

const enforceSupplierCatalogImportFeature =
    enforcePlanFeature(
        SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT,
    );

const enforceSupplierImportCommitAccess = async (
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
        const importSession =
            await SupplierCatalogImportSession
                .findOne({
                    _id:
                        req.validated.params.importId,
                    scope:
                        SUPPLIER_SCOPE
                            .WORKSPACE_PRIVATE,
                    workspace:
                        req.workspace._id,
                    actor: req.user._id,
                    status:
                        SUPPLIER_CATALOG_IMPORT_STATUS
                            .PREVIEWED,
                    expiresAt:
                        mongoose.trusted({
                            $gt: new Date(),
                        }),
                })
                .select('preview')
                .lean();

        if (!importSession) {
            throw new AppError(
                'Session d’import introuvable, expirée ou non prévisualisée.',
                404,
            );
        }

        const requiresArticleCreation =
            importSession.preview.some(
                ({ classification }) =>
                    classification
                    === 'CREATE_ARTICLE',
            );

        if (
            requiresArticleCreation
            && !req.permissions.includes(
                SUPPLIER_CATALOG_PERMISSION
                    .ARTICLE_MANAGE,
            )
        ) {
            throw new AppError(
                'Permission insuffisante pour créer les Articles fournisseur proposés par cet import.',
                403,
            );
        }

        return next();
    } catch (error) {
        return next(error);
    }
};

export {
    enforceSupplierCatalogImportFeature,
    enforceSupplierImportCommitAccess,
};
