import {
    PLAN_SYSTEM_ROLE,
} from '../constants/plan.constants.js';
import { Plan } from '../modules/plan/plan.model.js';
import {
    TECHNICAL_SHEET_METRIC,
} from '../modules/technicalSheet/technicalSheet.registry.js';

const M004_DEVELOPMENT_TECHNICAL_SHEET_LIMIT = 10;

/**
 * M-004 n'introduit pas encore de différenciation commerciale Premium/IA.
 *
 * La valeur 10 est donc une donnée temporaire de développement appliquée
 * uniformément aux Plans existants qui ne déclarent pas encore la métrique.
 * Elle ne fait jamais partie de la logique métier runtime.
 */
const addM004TechnicalSheetPlanLimit = async ({
    developmentLimit =
        M004_DEVELOPMENT_TECHNICAL_SHEET_LIMIT,
} = {}) => {
    if (
        !Number.isInteger(developmentLimit)
        || developmentLimit < 0
    ) {
        throw new TypeError(
            'La limite de développement M-004 doit être un entier positif ou nul.',
        );
    }

    const metricPath =
        'limits.'
        + TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS;

    const result = await Plan.collection.updateMany(
        {
            [metricPath]: {
                $exists: false,
            },
        },
        {
            $set: {
                [metricPath]:
                    developmentLimit,
            },
        },
    );

    const baseline = await Plan.findOne({
        systemRole:
            PLAN_SYSTEM_ROLE.BASELINE,
    })
        .select('_id limits')
        .lean();

    if (
        baseline
        && baseline.limits?.[
            TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS
        ] === undefined
    ) {
        throw new Error(
            'La limite M-004 du Plan baseline n’a pas été persistée.',
        );
    }

    return {
        matchedCount:
            result.matchedCount,
        modifiedCount:
            result.modifiedCount,
        developmentLimit,
    };
};

export {
    M004_DEVELOPMENT_TECHNICAL_SHEET_LIMIT,
    addM004TechnicalSheetPlanLimit,
};
