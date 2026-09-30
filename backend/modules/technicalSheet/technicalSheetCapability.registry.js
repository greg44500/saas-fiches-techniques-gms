import {
    USAGE_METRIC_BEHAVIOR,
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';
import {
    TECHNICAL_SHEET_METRIC,
} from './technicalSheet.registry.js';

const TECHNICAL_SHEET_CAPABILITY_MODULE = Object.freeze({
    metrics: Object.freeze([
        TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
    ]),
    metricDefinitions: Object.freeze({
        [TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS]: Object.freeze({
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
            remediationRequired: true,
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
    }),
});

export { TECHNICAL_SHEET_CAPABILITY_MODULE };
