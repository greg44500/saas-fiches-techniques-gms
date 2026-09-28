import {
    USAGE_METRIC_PERIOD_TYPE,
} from '../constants/usageMetric.constants.js';
import {
    TechnicalSheet,
} from '../modules/technicalSheet/technicalSheet.model.js';
import {
    TECHNICAL_SHEET_METRIC,
} from '../modules/technicalSheet/technicalSheet.registry.js';
import {
    UsageMetric,
} from '../modules/usageMetric/usageMetric.model.js';

const reconcileM004TechnicalSheetUsageMetric = async () => {
    const counts = await TechnicalSheet.aggregate([
        {
            $group: {
                _id: '$workspace',
                value: { $sum: 1 },
            },
        },
    ]);

    const persistedMetrics =
        await UsageMetric.find({
            metricKey:
                TECHNICAL_SHEET_METRIC
                    .TECHNICAL_SHEETS,
            periodType:
                USAGE_METRIC_PERIOD_TYPE
                    .CURRENT,
            periodStart: null,
        })
            .select('_id workspace value')
            .lean();

    const countsByWorkspace = new Map(
        counts.map(({ _id, value }) => [
            _id.toString(),
            value,
        ]),
    );
    const knownWorkspaceIds = new Set([
        ...countsByWorkspace.keys(),
        ...persistedMetrics.map(
            ({ workspace }) =>
                workspace.toString(),
        ),
    ]);

    let upserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const workspaceId of knownWorkspaceIds) {
        const expected =
            countsByWorkspace.get(
                workspaceId,
            ) ?? 0;

        const existing =
            persistedMetrics.find(
                ({ workspace }) =>
                    workspace.toString()
                    === workspaceId,
            );

        if (
            existing
            && existing.value === expected
        ) {
            unchanged += 1;
            continue;
        }

        const result =
            await UsageMetric.updateOne(
                existing
                    ? { _id: existing._id }
                    : {
                        workspace:
                            workspaceId,
                        metricKey:
                            TECHNICAL_SHEET_METRIC
                                .TECHNICAL_SHEETS,
                        periodType:
                            USAGE_METRIC_PERIOD_TYPE
                                .CURRENT,
                        periodStart: null,
                    },
                {
                    $set: {
                        value: expected,
                        updatedBy: null,
                    },
                    $setOnInsert: {
                        workspace:
                            workspaceId,
                        metricKey:
                            TECHNICAL_SHEET_METRIC
                                .TECHNICAL_SHEETS,
                        periodType:
                            USAGE_METRIC_PERIOD_TYPE
                                .CURRENT,
                        periodStart: null,
                        periodEnd: null,
                        createdBy: null,
                    },
                },
                {
                    upsert: true,
                    runValidators: true,
                },
            );

        if (result.upsertedCount > 0) {
            upserted += 1;
        } else {
            updated += 1;
        }
    }

    return {
        workspacesScanned:
            knownWorkspaceIds.size,
        upserted,
        updated,
        unchanged,
    };
};

export {
    reconcileM004TechnicalSheetUsageMetric,
};
