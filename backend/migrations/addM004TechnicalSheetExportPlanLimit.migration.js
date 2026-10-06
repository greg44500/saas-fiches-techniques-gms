import { Plan } from '../modules/plan/plan.model.js';
import {
    TECHNICAL_SHEET_METRIC,
} from '../modules/technicalSheet/technicalSheet.registry.js';

const M004_DEFAULT_MONTHLY_EXPORT_LIMIT = 10;

const addM004TechnicalSheetExportPlanLimit = async ({
    defaultLimit =
        M004_DEFAULT_MONTHLY_EXPORT_LIMIT,
} = {}) => {
    if (
        !Number.isInteger(defaultLimit)
        || defaultLimit < 0
    ) {
        throw new TypeError(
            'La limite mensuelle d’exports doit être un entier positif ou nul.',
        );
    }

    const metricPath =
        'limits.'
        + TECHNICAL_SHEET_METRIC
            .EXPORTS_MONTHLY;

    const result =
        await Plan.collection.updateMany(
            {
                [metricPath]: {
                    $exists: false,
                },
            },
            {
                $set: {
                    [metricPath]:
                        defaultLimit,
                },
            },
        );

    return {
        matchedCount:
            result.matchedCount,
        modifiedCount:
            result.modifiedCount,
        defaultLimit,
    };
};

export {
    M004_DEFAULT_MONTHLY_EXPORT_LIMIT,
    addM004TechnicalSheetExportPlanLimit,
};
