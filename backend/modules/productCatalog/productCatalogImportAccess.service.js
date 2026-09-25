import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    PRODUCT_CATALOG_FEATURE,
} from './productCatalogCapability.registry.js';
import {
    PRODUCT_CATALOG_PERMISSION,
} from './productCatalogPermission.registry.js';
import {
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_IMPORT_STATUS,
} from './productCatalog.registry.js';
import {
    ProductImportSession,
} from './productImportSession.model.js';

const COMMITTABLE_IMPORT_STATUSES = Object.freeze([
    PRODUCT_IMPORT_STATUS.PREVIEWED,
    PRODUCT_IMPORT_STATUS.COMMITTING,
]);

const addCreationRequirement = ({
    permissions,
    features,
}) => {
    permissions.add(PRODUCT_CATALOG_PERMISSION.CONTRIBUTE);
    features.add(PRODUCT_CATALOG_FEATURE.CONTRIBUTION);
};

const addCatalogManageRequirement = ({ permissions }) => {
    permissions.add(PRODUCT_CATALOG_PERMISSION.CATALOG_MANAGE);
};

const collectCommittedResultRequirements = (committedResult) => {
    const permissions = new Set();
    const features = new Set();

    for (const result of committedResult?.results ?? []) {
        if (result.status === 'ATTACHED_EXISTING') {
            addCatalogManageRequirement({ permissions });
        }

        if (
            result.status === 'CREATED_PRODUCT'
            || result.status === 'CREATED_VARIANT'
            || result.status === 'PENDING_REVIEW'
        ) {
            addCreationRequirement({ permissions, features });
        }
    }

    return {
        permissions: [...permissions],
        features: [...features],
    };
};

const collectProductImportCommitRequirements = ({
    preview = [],
    decisions = [],
    committedResult = null,
}) => {
    if (committedResult) {
        return collectCommittedResultRequirements(committedResult);
    }

    const permissions = new Set();
    const features = new Set();
    const decisionByRow = new Map(
        decisions.map((decision) => [decision.rowNumber, decision]),
    );

    for (const row of preview) {
        const decision = decisionByRow.get(row.rowNumber);

        if (decision?.action === 'SKIP') continue;

        if (
            row.classification
            === PRODUCT_IMPORT_ROW_CLASSIFICATION.ATTACH_EXISTING
        ) {
            addCatalogManageRequirement({ permissions });
            continue;
        }

        if (
            row.classification === PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT
            || row.classification === PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_VARIANT
        ) {
            addCreationRequirement({ permissions, features });
            continue;
        }

        if (
            row.classification
            !== PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED
        ) {
            continue;
        }

        if (row.reviewMode === 'REFERENCE_GOVERNANCE') {
            addCreationRequirement({ permissions, features });
            continue;
        }

        if (decision?.action === 'ATTACH_EXISTING') {
            addCatalogManageRequirement({ permissions });
        }

        if (decision?.action === 'CREATE_NEW') {
            addCreationRequirement({ permissions, features });
        }
    }

    return {
        permissions: [...permissions],
        features: [...features],
    };
};

const resolveProductImportCommitRequirements = async ({
    workspaceId,
    actorId,
    importId,
    decisions = [],
}) => {
    const now = new Date();

    const importSession = await ProductImportSession.findOne({
        _id: importId,
        scope: PRODUCT_IMPORT_SCOPE.WORKSPACE,
        workspace: workspaceId,
        actor: actorId,
        $or: [
            { status: PRODUCT_IMPORT_STATUS.COMMITTED },
            {
                status: mongoose.trusted({
                    $in: COMMITTABLE_IMPORT_STATUSES,
                }),
                expiresAt: mongoose.trusted({ $gt: now }),
            },
        ],
    }).lean();

    if (!importSession) {
        throw new AppError(
            'Session d’import introuvable, expirée ou non prévisualisée.',
            404,
        );
    }

    return collectProductImportCommitRequirements({
        preview: importSession.preview ?? [],
        decisions,
        committedResult:
            importSession.status === PRODUCT_IMPORT_STATUS.COMMITTED
                ? importSession.committedResult
                : null,
    });
};

export {
    collectProductImportCommitRequirements,
    resolveProductImportCommitRequirements,
};
