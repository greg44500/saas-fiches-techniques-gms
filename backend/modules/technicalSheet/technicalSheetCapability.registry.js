import {
    USAGE_METRIC_BEHAVIOR,
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';
import {
    TECHNICAL_SHEET_FEATURE,
    TECHNICAL_SHEET_METRIC,
} from './technicalSheet.registry.js';

const TECHNICAL_SHEET_CAPABILITY_MODULE = Object.freeze({
    features: Object.freeze([
        TECHNICAL_SHEET_FEATURE.EXPORT,
    ]),
    featureDefinitions: Object.freeze({
        [TECHNICAL_SHEET_FEATURE.EXPORT]: Object.freeze({
            label: 'Exports de Fiches techniques',
            description:
                'Permet d’exporter les versions validées des Fiches techniques en PDF, XLSX ou CSV.',
            category: 'technical_sheets',
            categoryLabel: 'Fiches techniques',
            displayOrder: 20,
            tags: Object.freeze([]),
        }),
    }),
    metrics: Object.freeze([
        TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
        TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY,
    ]),
    metricDefinitions: Object.freeze({
        [TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS]: Object.freeze({
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
            remediationRequired: true,
        }),
        [TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY]: Object.freeze({
            periodType: USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
            behavior: USAGE_METRIC_BEHAVIOR.CONSUMPTION,
            remediationRequired: false,
        }),
    }),
    metricPresentations: Object.freeze({
        [TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS]: Object.freeze({
            label: 'Fiches techniques',
            description:
                'Nombre de Fiches techniques conservées dans le Workspace, corbeille comprise.',
            category: 'technical_sheets',
            categoryLabel: 'Fiches techniques',
            displayOrder: 10,
            unit: 'count',
        }),
        [TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY]: Object.freeze({
            label: 'Exports mensuels de Fiches techniques',
            description:
                'Nombre total d’exports PDF, XLSX et CSV générés pendant le mois calendaire.',
            category: 'technical_sheets',
            categoryLabel: 'Fiches techniques',
            displayOrder: 20,
            unit: 'count',
        }),
    }),
    featureMetrics: Object.freeze({
        [TECHNICAL_SHEET_FEATURE.EXPORT]: Object.freeze([
            TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY,
        ]),
    }),
    metricOverridePolicies: Object.freeze({
        [TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY]: Object.freeze({
            control: 'preset_slider',
            values: Object.freeze([
                0,
                10,
                25,
                50,
                100,
                250,
                500,
            ]),
            allowUnlimited: false,
        }),
    }),
    featureOverridePolicies: Object.freeze({
        [TECHNICAL_SHEET_FEATURE.EXPORT]: Object.freeze({
            requiredLimits: Object.freeze({
                [TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY]: Object.freeze({
                    minimumEffectiveValue: 1,
                    minimumHeadroom: 1,
                }),
            }),
        }),
    }),
});

export { TECHNICAL_SHEET_CAPABILITY_MODULE };
