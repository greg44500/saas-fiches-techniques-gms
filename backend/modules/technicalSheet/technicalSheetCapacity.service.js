import {
    getWorkspaceEffectiveEntitlement,
} from '../subscriptions/subscription.service.js';
import {
    getUsageMetricValue,
} from '../usageMetric/usageMetric.service.js';
import {
    TECHNICAL_SHEET_METRIC,
} from './technicalSheet.registry.js';

const getTechnicalSheetCapacity = async ({
    workspaceId,
    at = new Date(),
    session = null,
}) => {
    const [
        entitlement,
        current,
    ] = await Promise.all([
        getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
            session,
        }),
        getUsageMetricValue({
            workspaceId,
            metricKey:
                TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
            at,
            session,
        }),
    ]);

    const limit =
        entitlement.effectiveCapabilities
            .limits[
                TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS
            ];

    if (limit === undefined) {
        throw new Error(
            'La limite effective technical_sheets est absente.',
        );
    }

    return {
        metricKey:
            TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS,
        current,
        limit,
        unlimited: limit === null,
        remaining:
            limit === null
                ? null
                : Math.max(limit - current, 0),
    };
};

export { getTechnicalSheetCapacity };
