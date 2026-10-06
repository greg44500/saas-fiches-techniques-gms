import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    assertEntitlementFeatureAvailable,
} from '../plan/planFeature.service.js';
import {
    reserveEffectiveLimitForEntitlement,
    resolveEffectiveMetricLimit,
} from '../plan/planLimit.service.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../subscriptions/subscription.service.js';
import {
    getUsageMetricValue,
} from '../usageMetric/usageMetric.service.js';
import { AppError } from '../../utils/appError.js';
import {
    TECHNICAL_SHEET_FEATURE,
    TECHNICAL_SHEET_METRIC,
    TECHNICAL_SHEET_STATUS,
} from './technicalSheet.registry.js';
import {
    TechnicalSheet,
} from './technicalSheet.model.js';
import {
    TechnicalSheetValidation,
} from './technicalSheetValidation.model.js';
import {
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    TECHNICAL_SHEET_EXPORT_DEFINITION,
    TECHNICAL_SHEET_EXPORT_FORMAT,
} from './technicalSheetExport.registry.js';
import {
    buildTechnicalSheetExportProjection,
} from './technicalSheetExportProjection.service.js';
import {
    buildTechnicalSheetPdf,
} from './technicalSheetExportPdf.service.js';
import {
    buildTechnicalSheetCsv,
    buildTechnicalSheetXlsx,
} from './technicalSheetExportSpreadsheet.service.js';

const slugifyFileName = (value) => (
    String(
        value
        ?? 'fiche-technique',
    )
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            '',
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            '-',
        )
        .replace(
            /^-+|-+$/g,
            '',
        )
        .slice(0, 80)
    || 'fiche-technique'
);

const buildExportFileName = ({
    title,
    validatedAt,
    extension,
}) => {
    const date =
        new Date(validatedAt);
    const datePart =
        Number.isNaN(
            date.getTime(),
        )
            ? 'validation'
            : date
                .toISOString()
                .slice(0, 10);

    return (
        'fiche-technique-'
        + slugifyFileName(title)
        + '-'
        + datePart
        + '.'
        + extension
    );
};

const loadCurrentValidatedExportSource = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
}) => {
    const sheet =
        await TechnicalSheet.findOne(
            mongoose.trusted({
                _id: technicalSheetId,
                workspace: workspaceId,
                dossier: dossierId,
                status: mongoose.trusted({
                    $ne:
                        TECHNICAL_SHEET_STATUS.DELETED,
                }),
            }),
        )
            .select(
                '_id currentValidatedState',
            )
            .lean();

    if (!sheet) {
        throw new AppError(
            'Fiche technique introuvable.',
            404,
        );
    }

    if (!sheet.currentValidatedState) {
        throw new AppError(
            'Validez la Fiche technique avant de l’exporter.',
            409,
        );
    }

    const validation =
        await TechnicalSheetValidation.findOne(
            mongoose.trusted({
                _id:
                    sheet.currentValidatedState,
                workspace: workspaceId,
                dossier: dossierId,
                technicalSheet:
                    technicalSheetId,
            }),
        );

    if (!validation) {
        throw new AppError(
            'La version validée courante est introuvable.',
            409,
        );
    }

    return validation;
};

const generateTechnicalSheetArtifact = ({
    projection,
    format,
}) => {
    switch (format) {
        case TECHNICAL_SHEET_EXPORT_FORMAT.PDF:
            return buildTechnicalSheetPdf(
                projection,
            );
        case TECHNICAL_SHEET_EXPORT_FORMAT.XLSX:
            return buildTechnicalSheetXlsx(
                projection,
            );
        case TECHNICAL_SHEET_EXPORT_FORMAT.CSV:
            return buildTechnicalSheetCsv(
                projection,
            );
        default:
            throw new AppError(
                'Format d’export non pris en charge.',
                400,
            );
    }
};

const assertExportFeature = async ({
    workspaceId,
    at,
    session = null,
}) => {
    const entitlement =
        await getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
            session,
        });

    assertEntitlementFeatureAvailable({
        entitlement,
        featureKey:
            TECHNICAL_SHEET_FEATURE.EXPORT,
    });

    return entitlement;
};

const exportCurrentValidatedTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    format,
    at = new Date(),
}) => {
    const definition =
        TECHNICAL_SHEET_EXPORT_DEFINITION[
            format
        ];

    if (!definition) {
        throw new AppError(
            'Format d’export non pris en charge.',
            400,
        );
    }

    await assertExportFeature({
        workspaceId,
        at,
    });

    const validation =
        await loadCurrentValidatedExportSource({
            workspaceId,
            dossierId,
            technicalSheetId,
        });
    const projection =
        buildTechnicalSheetExportProjection({
            validation,
        });
    const buffer =
        generateTechnicalSheetArtifact({
            projection,
            format,
        });

    await mongoose.connection.transaction(
        async (session) => {
            const entitlement =
                await assertExportFeature({
                    workspaceId,
                    at,
                    session,
                });

            await reserveEffectiveLimitForEntitlement({
                workspaceId,
                effectiveEntitlement:
                    entitlement,
                metricKey:
                    TECHNICAL_SHEET_METRIC
                        .EXPORTS_MONTHLY,
                amount: 1,
                at,
                actorId,
                session,
            });

            await createTechnicalSheetEvent({
                workspaceId,
                dossierId,
                actorId,
                action:
                    BUSINESS_ACTIVITY_ACTION
                        .TECHNICAL_SHEET_EXPORTED,
                technicalSheetId,
                metadata: {
                    validationId:
                        projection.validationId,
                    format,
                },
                session,
            });
        },
    );

    return {
        buffer,
        fileName:
            buildExportFileName({
                title:
                    projection.title,
                validatedAt:
                    projection.validatedAt,
                extension:
                    definition.extension,
            }),
        mimeType:
            definition.mimeType,
        validationId:
            projection.validationId,
    };
};

const getTechnicalSheetExportUsage = async ({
    workspaceId,
    at = new Date(),
}) => {
    const entitlement =
        await assertExportFeature({
            workspaceId,
            at,
        });
    const limit =
        resolveEffectiveMetricLimit({
            entitlement,
            metricKey:
                TECHNICAL_SHEET_METRIC
                    .EXPORTS_MONTHLY,
        });
    const current =
        await getUsageMetricValue({
            workspaceId,
            metricKey:
                TECHNICAL_SHEET_METRIC
                    .EXPORTS_MONTHLY,
            at,
        });

    return {
        current,
        limit,
        unlimited:
            limit === null,
        remaining:
            limit === null
                ? null
                : Math.max(
                    limit - current,
                    0,
                ),
    };
};

export {
    buildExportFileName,
    exportCurrentValidatedTechnicalSheet,
    generateTechnicalSheetArtifact,
    getTechnicalSheetExportUsage,
    loadCurrentValidatedExportSource,
    slugifyFileName,
};
