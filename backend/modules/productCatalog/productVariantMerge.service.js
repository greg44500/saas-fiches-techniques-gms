import { createHash } from 'node:crypto';

import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    SupplierArticle,
} from '../supplierCatalog/supplier.model.js';
import {
    SupplierCatalogLine,
} from '../supplierCatalog/supplierCatalog.model.js';
import {
    INDICATIVE_PRICE_STATUS,
} from '../supplierCatalog/supplierCatalog.registry.js';
import {
    IndicativePrice,
} from '../supplierCatalog/supplierPricing.model.js';
import {
    TechnicalSheetDraft,
} from '../technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from '../technicalSheet/technicalSheetValidation.model.js';
import {
    TECHNICAL_SHEET_LINE_VALUATION_STATUS,
    TECHNICAL_SHEET_VALUATION_STATUS,
} from '../technicalSheet/technicalSheet.registry.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    buildVariantSignature,
    matchesProductSearchValues,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
} from './productCatalog.registry.js';
import {
    createProductReferenceEvent,
} from './productReferenceEvent.service.js';
import { ProductVariant } from './productVariant.model.js';
import { ReferenceContribution } from './referenceContribution.model.js';
import { WorkspaceProduct } from './workspaceProduct.model.js';

const conflictError = (message, code = 'PRODUCT_VARIANT_MERGE_CONFLICT') => {
    const error = new AppError(message, 409);
    error.code = code;
    return error;
};

const toId = (value) => value?._id?.toString?.() ?? value?.toString?.() ?? null;

const serializeDimension = (value) => (
    value
        ? {
            id: toId(value),
            name: value.name ?? null,
            ...(value.kind ? { kind: value.kind } : {}),
        }
        : null
);

const serializeVariantIdentity = (variant) => ({
    id: variant._id.toString(),
    name: variant.name,
    status: variant.status,
    governanceStatus: variant.governanceStatus,
    variety: serializeDimension(variant.variety),
    characteristics: (variant.characteristics ?? [])
        .filter(Boolean)
        .map(serializeDimension),
    processingState: variant.processingState ?? null,
    conservationType: variant.conservationType,
    foodRange: variant.foodRange ?? null,
    referenceUnit: variant.referenceUnit,
    countUnitLabelSingular: variant.countUnitLabelSingular ?? null,
    countUnitLabelPlural: variant.countUnitLabelPlural ?? null,
    yieldPercent: variant.yieldPercent ?? null,
});

const normalizedNullable = (value) => (
    value === null || value === undefined || value === ''
        ? null
        : String(value).trim()
);

const normalizedIdList = (values = []) => (
    values
        .map((value) => toId(value))
        .filter(Boolean)
        .sort()
);

const formatDimensions = (values = []) => (
    values
        .filter(Boolean)
        .map((value) => value.name ?? toId(value))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'fr'))
        .join(', ')
        || null
);

const buildVariantDifferences = ({ retained, replaced }) => {
    const fields = [
        {
            field: 'name',
            label: 'Nom',
            retained: retained.name,
            replaced: replaced.name,
            blocking: false,
        },
        {
            field: 'variety',
            label: 'Variété',
            retained: retained.variety?.name ?? null,
            replaced: replaced.variety?.name ?? null,
            retainedKey: toId(retained.variety),
            replacedKey: toId(replaced.variety),
            blocking: false,
        },
        {
            field: 'characteristics',
            label: 'Caractéristiques',
            retained: formatDimensions(retained.characteristics),
            replaced: formatDimensions(replaced.characteristics),
            retainedKey: normalizedIdList(retained.characteristics).join('|'),
            replacedKey: normalizedIdList(replaced.characteristics).join('|'),
            blocking: false,
        },
        {
            field: 'processingState',
            label: 'État de préparation',
            retained: retained.processingState ?? null,
            replaced: replaced.processingState ?? null,
            blocking: false,
        },
        {
            field: 'conservationType',
            label: 'Conservation',
            retained: retained.conservationType ?? null,
            replaced: replaced.conservationType ?? null,
            blocking: false,
        },
        {
            field: 'foodRange',
            label: 'Gamme',
            retained: retained.foodRange ?? null,
            replaced: replaced.foodRange ?? null,
            blocking: false,
        },
        {
            field: 'referenceUnit',
            label: 'Unité de référence',
            retained: retained.referenceUnit,
            replaced: replaced.referenceUnit,
            blocking: true,
        },
        {
            field: 'countUnitLabelSingular',
            label: 'Libellé unité',
            retained: retained.referenceUnit === PRODUCT_REFERENCE_UNIT.UNIT
                ? retained.countUnitLabelSingular ?? 'pièce'
                : null,
            replaced: replaced.referenceUnit === PRODUCT_REFERENCE_UNIT.UNIT
                ? replaced.countUnitLabelSingular ?? 'pièce'
                : null,
            blocking: true,
        },
        {
            field: 'countUnitLabelPlural',
            label: 'Libellé unité au pluriel',
            retained: retained.referenceUnit === PRODUCT_REFERENCE_UNIT.UNIT
                ? retained.countUnitLabelPlural ?? 'pièces'
                : null,
            replaced: replaced.referenceUnit === PRODUCT_REFERENCE_UNIT.UNIT
                ? replaced.countUnitLabelPlural ?? 'pièces'
                : null,
            blocking: true,
        },
        {
            field: 'yieldPercent',
            label: 'Rendement',
            retained: retained.yieldPercent ?? null,
            replaced: replaced.yieldPercent ?? null,
            blocking: true,
        },
    ];

    return fields
        .filter((entry) => (
            normalizedNullable(entry.retainedKey ?? entry.retained)
            !== normalizedNullable(entry.replacedKey ?? entry.replaced)
        ))
        .map(({ retainedKey, replacedKey, ...entry }) => entry);
};

const priceScopeKey = ({ workspace, dossier }) => (
    (toId(workspace) ?? 'GLOBAL')
    + ':'
    + (toId(dossier) ?? 'ALL')
);

const stableRows = (rows, mapper) => rows
    .map(mapper)
    .sort((left, right) => left.localeCompare(right));

const buildFingerprint = ({
    retained,
    replaced,
    targetName,
    supplierArticles,
    catalogLines,
    workspaceProducts,
    sourcePrices,
    targetPrices,
    drafts,
    pendingContributions,
}) => {
    const payload = {
        retained: [
            retained._id.toString(),
            retained.updatedAt?.toISOString?.() ?? String(retained.updatedAt ?? ''),
            retained.name,
            retained.status,
            retained.governanceStatus,
        ],
        replaced: [
            replaced._id.toString(),
            replaced.updatedAt?.toISOString?.() ?? String(replaced.updatedAt ?? ''),
            replaced.name,
            replaced.status,
            replaced.governanceStatus,
            toId(replaced.replacementVariant),
        ],
        targetName,
        supplierArticles: stableRows(
            supplierArticles,
            (row) => row._id.toString(),
        ),
        catalogLines: stableRows(
            catalogLines,
            (row) => row._id.toString(),
        ),
        workspaceProducts: stableRows(
            workspaceProducts,
            (row) => (
                row._id.toString()
                + ':' + row.status
                + ':' + (row.updatedAt?.toISOString?.() ?? String(row.updatedAt ?? ''))
            ),
        ),
        sourcePrices: stableRows(
            sourcePrices,
            (row) => row._id.toString() + ':' + row.status,
        ),
        targetPrices: stableRows(
            targetPrices,
            (row) => row._id.toString() + ':' + row.status,
        ),
        drafts: stableRows(
            drafts,
            (row) => (
                row._id.toString()
                + ':' + row.revision
                + ':' + (row.updatedAt?.toISOString?.() ?? String(row.updatedAt ?? ''))
            ),
        ),
        pendingContributions: stableRows(
            pendingContributions,
            (row) => (
                row._id.toString()
                + ':' + (row.updatedAt?.toISOString?.() ?? String(row.updatedAt ?? ''))
            ),
        ),
    };

    return createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
};

const loadVariant = async ({
    productId,
    variantId,
    session = null,
}) => ProductVariant.findOne({
    _id: variantId,
    canonicalProduct: productId,
})
    .populate('variety')
    .populate('characteristics')
    .session(session);

const assertMergeableVariantState = ({ retained, replaced }) => {
    if (!retained || !replaced) {
        throw new AppError('Référence Produit introuvable.', 404);
    }

    if (retained._id.equals(replaced._id)) {
        throw new AppError(
            'Une Référence Produit ne peut pas être fusionnée avec elle-même.',
            400,
        );
    }

    if (
        !replaced.identityActive
        || replaced.replacementVariant
        || replaced.governanceStatus === PRODUCT_GOVERNANCE_STATUS.RESOLVED
    ) {
        throw conflictError(
            'Cette Référence Produit a déjà été remplacée.',
            'PRODUCT_VARIANT_ALREADY_MERGED',
        );
    }

    if (!retained.identityActive) {
        throw conflictError(
            'La Référence Produit à conserver n’est plus active dans le référentiel.',
        );
    }
};

const collectMergePlan = async ({
    productId,
    retainedVariantId,
    replacedVariantId,
    targetName = null,
    session = null,
}) => {
    const [product, retained, replaced] = await Promise.all([
        CanonicalProduct.findOne({
            _id: productId,
            identityActive: true,
        }).session(session),
        loadVariant({
            productId,
            variantId: retainedVariantId,
            session,
        }),
        loadVariant({
            productId,
            variantId: replacedVariantId,
            session,
        }),
    ]);

    if (!product) {
        throw new AppError('Produit introuvable.', 404);
    }

    assertMergeableVariantState({ retained, replaced });

    const finalName = String(targetName ?? retained.name).trim();
    const normalizedName = normalizeProductText(finalName);
    if (!normalizedName) {
        throw new AppError('Le nom cible de la Référence est invalide.', 400);
    }

    const differences = buildVariantDifferences({ retained, replaced });
    const conflicts = [];

    if (product.status !== PRODUCT_STATUS.ACTIVE) {
        conflicts.push({
            code: 'PRODUCT_INACTIVE',
            message:
                'Le Produit parent doit être actif avant de fusionner ses Références.',
        });
    }

    if (
        retained.governanceStatus
        !== PRODUCT_GOVERNANCE_STATUS.APPROVED
    ) {
        conflicts.push({
            code: 'RETAINED_VARIANT_NOT_APPROVED',
            message:
                'La Référence conservée doit être validée par la gouvernance.',
        });
    }

    if (![
        PRODUCT_GOVERNANCE_STATUS.APPROVED,
        PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
    ].includes(replaced.governanceStatus)) {
        conflicts.push({
            code: 'REPLACED_VARIANT_NOT_MERGEABLE',
            message:
                'La Référence remplacée n’est pas dans un état fusionnable.',
        });
    }

    for (const difference of differences.filter(({ blocking }) => blocking)) {
        conflicts.push({
            code: 'CALCULATION_IDENTITY_MISMATCH',
            field: difference.field,
            message:
                'La différence « ' + difference.label
                + ' » modifierait les calculs ou les unités. '
                + 'Corrigez les Références avant de les fusionner.',
        });
    }

    const duplicateName = await ProductVariant.findOne({
        _id: mongoose.trusted({
            $nin: [retained._id, replaced._id],
        }),
        normalizedName,
        identityActive: true,
        governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
    }).session(session);

    if (duplicateName) {
        conflicts.push({
            code: 'TARGET_NAME_COLLISION',
            message:
                'Le nom cible appartient déjà à une autre Référence Produit.',
        });
    }

    const [
        supplierArticles,
        catalogLines,
        workspaceProducts,
        sourcePrices,
        targetPrices,
        drafts,
        validations,
        pendingContributions,
    ] = await Promise.all([
        SupplierArticle.find({
            productVariant: replaced._id,
        })
            .select('_id updatedAt')
            .lean()
            .session(session),
        SupplierCatalogLine.find({
            productVariant: replaced._id,
        })
            .select('_id updatedAt')
            .lean()
            .session(session),
        WorkspaceProduct.find({
            productVariant: replaced._id,
        })
            .select('_id workspace status updatedAt')
            .lean()
            .session(session),
        IndicativePrice.find({
            productVariant: replaced._id,
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
        })
            .select('_id workspace dossier status')
            .lean()
            .session(session),
        IndicativePrice.find({
            productVariant: retained._id,
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
        })
            .select('_id workspace dossier status')
            .lean()
            .session(session),
        TechnicalSheetDraft.find({
            'lines.productVariant': replaced._id,
        })
            .select('_id revision updatedAt lines.productVariant')
            .lean()
            .session(session),
        TechnicalSheetValidation.find({
            'linesSnapshot.productVariantId': replaced._id,
        })
            .select('_id')
            .lean()
            .session(session),
        ReferenceContribution.find({
            status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
            provisionalEntityType:
                PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
            provisionalEntityId: replaced._id,
        })
            .select('_id updatedAt')
            .lean()
            .session(session),
    ]);

    const targetPriceScopes = new Set(
        targetPrices.map(priceScopeKey),
    );
    const priceCollisions = sourcePrices.filter(
        (price) => targetPriceScopes.has(priceScopeKey(price)),
    );

    if (priceCollisions.length > 0) {
        conflicts.push({
            code: 'INDICATIVE_PRICE_COLLISION',
            message:
                'Un Prix indicatif actif existe déjà sur la Référence conservée '
                + 'pour au moins un même périmètre. '
                + 'Résolvez ce prix avant la fusion.',
            count: priceCollisions.length,
        });
    }

    const affectedLineCount = drafts.reduce(
        (total, draft) => total + (draft.lines ?? []).filter(
            (line) => toId(line.productVariant) === replaced._id.toString(),
        ).length,
        0,
    );

    const dependencies = {
        supplierArticles: supplierArticles.length,
        supplierCatalogLines: catalogLines.length,
        workspaceFavorites: workspaceProducts.filter(
            ({ status }) => status === WORKSPACE_PRODUCT_STATUS.ACTIVE,
        ).length,
        indicativePrices: sourcePrices.length,
        technicalSheetDrafts: drafts.length,
        technicalSheetLines: affectedLineCount,
        validatedTechnicalSheets: validations.length,
        pendingContributions: pendingContributions.length,
    };

    const previewFingerprint = buildFingerprint({
        retained,
        replaced,
        targetName: finalName,
        supplierArticles,
        catalogLines,
        workspaceProducts,
        sourcePrices,
        targetPrices,
        drafts,
        pendingContributions,
    });

    return {
        product: {
            id: product._id.toString(),
            name: product.name,
            status: product.status,
        },
        retained,
        replaced,
        retainedSerialized: serializeVariantIdentity(retained),
        replacedSerialized: serializeVariantIdentity(replaced),
        targetName: finalName,
        normalizedName,
        differences,
        dependencies,
        conflicts,
        previewFingerprint,
        canMerge: conflicts.length === 0,
    };
};

const listProductVariantMergeCandidates = async ({
    productId,
    sourceVariantId,
    q = null,
    limit = 20,
}) => {
    const source = await loadVariant({
        productId,
        variantId: sourceVariantId,
    });

    if (
        !source
        || !source.identityActive
        || source.replacementVariant
    ) {
        throw new AppError('Référence Produit de départ indisponible.', 404);
    }

    const candidates = await ProductVariant.find({
        _id: mongoose.trusted({ $ne: source._id }),
        canonicalProduct: productId,
        identityActive: true,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        governanceStatus: mongoose.trusted({
            $in: [
                PRODUCT_GOVERNANCE_STATUS.APPROVED,
                PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
            ],
        }),
    })
        .populate('variety')
        .populate('characteristics')
        .sort({ name: 1, _id: 1 });

    const query = String(q ?? '').trim();
    const filtered = candidates.filter((candidate) => {
        if (
            source.governanceStatus !== PRODUCT_GOVERNANCE_STATUS.APPROVED
            && candidate.governanceStatus !== PRODUCT_GOVERNANCE_STATUS.APPROVED
        ) {
            return false;
        }

        const retained =
            candidate.governanceStatus === PRODUCT_GOVERNANCE_STATUS.APPROVED
                ? candidate
                : source;
        const replaced = retained === candidate ? source : candidate;
        const blockingDifference = buildVariantDifferences({
            retained,
            replaced,
        }).some(({ blocking }) => blocking);

        if (blockingDifference) return false;
        if (!query) return true;

        return matchesProductSearchValues(query, [
            candidate.name,
            candidate.variety?.name,
            ...(candidate.characteristics ?? []).map(({ name }) => name),
        ].filter(Boolean));
    });

    return filtered.slice(0, limit).map((candidate) => ({
        ...serializeVariantIdentity(candidate),
        canBeRetained:
            candidate.governanceStatus
            === PRODUCT_GOVERNANCE_STATUS.APPROVED,
    }));
};

const assertNoActiveIndicativePriceCollision = async ({
    sourceVariantId,
    targetVariantId,
    session,
}) => {
    const [sourcePrices, targetPrices] = await Promise.all([
        IndicativePrice.find({
            productVariant: sourceVariantId,
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
        }).session(session),
        IndicativePrice.find({
            productVariant: targetVariantId,
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
        })
            .select('_id workspace dossier')
            .lean()
            .session(session),
    ]);

    const targetScopes = new Set(targetPrices.map(priceScopeKey));
    if (sourcePrices.some((price) => targetScopes.has(priceScopeKey(price)))) {
        throw conflictError(
            'Un Prix indicatif actif existe déjà sur la Référence conservée '
            + 'pour le même périmètre.',
            'INDICATIVE_PRICE_COLLISION',
        );
    }

    return sourcePrices;
};

const reconcileWorkspaceFavorites = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => {
    const sourceEntries = await WorkspaceProduct.find({
        productVariant: sourceVariantId,
    }).session(session);

    for (const sourceEntry of sourceEntries) {
        let targetEntry = await WorkspaceProduct.findOne({
            workspace: sourceEntry.workspace,
            productVariant: targetVariantId,
        }).session(session);

        if (
            sourceEntry.status === WORKSPACE_PRODUCT_STATUS.ACTIVE
            && !targetEntry
        ) {
            [targetEntry] = await WorkspaceProduct.create([
                {
                    workspace: sourceEntry.workspace,
                    productVariant: targetVariantId,
                    status: WORKSPACE_PRODUCT_STATUS.ACTIVE,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ], { session });
        } else if (
            sourceEntry.status === WORKSPACE_PRODUCT_STATUS.ACTIVE
            && targetEntry
            && targetEntry.status !== WORKSPACE_PRODUCT_STATUS.ACTIVE
        ) {
            targetEntry.status = WORKSPACE_PRODUCT_STATUS.ACTIVE;
            targetEntry.updatedBy = actorId;
            await targetEntry.save({ session });
        }

        if (sourceEntry.status !== WORKSPACE_PRODUCT_STATUS.ARCHIVED) {
            sourceEntry.status = WORKSPACE_PRODUCT_STATUS.ARCHIVED;
            sourceEntry.updatedBy = actorId;
            await sourceEntry.save({ session });
        }
    }
};

const migrateActiveIndicativePrices = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => {
    const sourcePrices = await assertNoActiveIndicativePriceCollision({
        sourceVariantId,
        targetVariantId,
        session,
    });

    const now = new Date();

    for (const price of sourcePrices) {
        await IndicativePrice.create([
            {
                workspace: price.workspace ?? null,
                dossier: price.dossier ?? null,
                productVariant: targetVariantId,
                sourceAmount: price.sourceAmount,
                sourceBasis: price.sourceBasis,
                currency: price.currency,
                normalizedAmount: price.normalizedAmount,
                normalizedUnit: price.normalizedUnit,
                source: price.source ?? null,
                packaging: price.packaging?.toObject?.()
                    ?? price.packaging
                    ?? null,
                sourceOrganization: price.sourceOrganization ?? null,
                sourceUrl: price.sourceUrl ?? null,
                observedAt: price.observedAt ?? null,
                status: INDICATIVE_PRICE_STATUS.ACTIVE,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

        price.status = INDICATIVE_PRICE_STATUS.ARCHIVED;
        price.archivedAt = now;
        price.archivedBy = actorId;
        price.updatedBy = actorId;
        await price.save({ session });
    }

    return sourcePrices.length;
};

const invalidateAffectedDrafts = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => TechnicalSheetDraft.updateMany(
    { 'lines.productVariant': sourceVariantId },
    {
        $set: {
            'lines.$[line].productVariant': targetVariantId,
            'lines.$[line].valuation.status':
                TECHNICAL_SHEET_LINE_VALUATION_STATUS.STALE,
            'lines.$[line].valuation.supplierArticleId': null,
            'lines.$[line].valuation.applicableSource': null,
            'lines.$[line].valuation.applicableSourceId': null,
            'lines.$[line].valuation.normalizedAmount': null,
            'lines.$[line].valuation.normalizedUnit': null,
            'lines.$[line].valuation.lineCostHt': null,
            'lines.$[line].valuation.materialCostSharePercent': null,
            'lines.$[line].valuation.pricedAt': null,
            'lines.$[line].valuation.sourceFingerprint': null,
            'lines.$[line].valuation.alerts': [],
            valuationStatus: TECHNICAL_SHEET_VALUATION_STATUS.STALE,
            valuedAt: null,
            valuationFingerprint: null,
            economicSnapshot: null,
            updatedBy: actorId,
        },
        $inc: { revision: 1 },
    },
    {
        session,
        arrayFilters: [{ 'line.productVariant': sourceVariantId }],
    },
);

const reconcileProductVariantDependencies = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => {
    const priceCount = await migrateActiveIndicativePrices({
        sourceVariantId,
        targetVariantId,
        actorId,
        session,
    });

    await reconcileWorkspaceFavorites({
        sourceVariantId,
        targetVariantId,
        actorId,
        session,
    });

    const [supplierArticles, catalogLines, drafts] = await Promise.all([
        SupplierArticle.updateMany(
            { productVariant: sourceVariantId },
            {
                $set: {
                    productVariant: targetVariantId,
                    updatedBy: actorId,
                },
            },
            { session },
        ),
        SupplierCatalogLine.updateMany(
            { productVariant: sourceVariantId },
            {
                $set: {
                    productVariant: targetVariantId,
                    updatedBy: actorId,
                },
            },
            { session },
        ),
        invalidateAffectedDrafts({
            sourceVariantId,
            targetVariantId,
            actorId,
            session,
        }),
    ]);

    return {
        supplierArticles: supplierArticles.modifiedCount ?? 0,
        supplierCatalogLines: catalogLines.modifiedCount ?? 0,
        indicativePrices: priceCount,
        technicalSheetDrafts: drafts.modifiedCount ?? 0,
    };
};

const resolvePendingVariantContributions = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => {
    const contributions = await ReferenceContribution.find({
        status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
        provisionalEntityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT,
        provisionalEntityId: sourceVariantId,
    }).session(session);

    for (const contribution of contributions) {
        contribution.status = PRODUCT_CONTRIBUTION_STATUS.APPROVED;
        contribution.reviewer = actorId;
        contribution.reviewedAt = new Date();
        contribution.resolutionEntityType =
            PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT;
        contribution.resolutionEntityId = targetVariantId;
        await contribution.save({ session });

        await createProductReferenceEvent({
            actorId,
            workspaceId: contribution.workspace,
            action: PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_APPROVED,
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CONTRIBUTION,
            entityId: contribution._id,
            metadata: {
                decision: 'MERGE',
                resolutionEntityId: targetVariantId.toString(),
            },
            session,
        });
    }

    return contributions.length;
};

const previewProductVariantMerge = async (input) => {
    const plan = await collectMergePlan(input);

    return {
        product: plan.product,
        retained: plan.retainedSerialized,
        replaced: plan.replacedSerialized,
        targetName: plan.targetName,
        differences: plan.differences,
        dependencies: plan.dependencies,
        conflicts: plan.conflicts,
        canMerge: plan.canMerge,
        previewFingerprint: plan.previewFingerprint,
    };
};

const mergeProductVariants = async ({
    actorId,
    productId,
    retainedVariantId,
    replacedVariantId,
    targetName = null,
    previewFingerprint,
}) => mongoose.connection.transaction(async (session) => {
    const plan = await collectMergePlan({
        productId,
        retainedVariantId,
        replacedVariantId,
        targetName,
        session,
    });

    if (plan.previewFingerprint !== previewFingerprint) {
        throw conflictError(
            'Les données ont changé depuis la prévisualisation. '
            + 'Actualisez la fusion avant de confirmer.',
            'PRODUCT_VARIANT_MERGE_STALE_PREVIEW',
        );
    }

    if (!plan.canMerge) {
        throw conflictError(
            plan.conflicts[0]?.message
                ?? 'La fusion ne peut pas être exécutée.',
        );
    }

    const { retained, replaced } = plan;

    replaced.status = PRODUCT_STATUS.ARCHIVED;
    replaced.governanceStatus = PRODUCT_GOVERNANCE_STATUS.RESOLVED;
    replaced.identityActive = false;
    replaced.replacementVariant = retained._id;
    replaced.updatedBy = actorId;
    await replaced.save({ session });

    retained.name = plan.targetName;
    retained.normalizedName = plan.normalizedName;
    retained.normalizedSignature = buildVariantSignature({
        name: plan.targetName,
        varietyId: retained.variety?._id ?? retained.variety,
        characteristics: retained.characteristics ?? [],
    });
    retained.status = PRODUCT_STATUS.ACTIVE;
    retained.updatedBy = actorId;

    try {
        await retained.save({ session });
    } catch (error) {
        if (error?.code === 11000) {
            throw conflictError(
                'La fusion créerait une Référence Produit en doublon.',
                'PRODUCT_VARIANT_MERGE_DUPLICATE',
            );
        }
        throw error;
    }

    const reconciled = await reconcileProductVariantDependencies({
        sourceVariantId: replaced._id,
        targetVariantId: retained._id,
        actorId,
        session,
    });

    const contributionCount = await resolvePendingVariantContributions({
        sourceVariantId: replaced._id,
        targetVariantId: retained._id,
        actorId,
        session,
    });

    await createProductReferenceEvent({
        actorId,
        action: PRODUCT_REFERENCE_EVENT_ACTION.VARIANT_MERGED,
        entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT,
        entityId: productId,
        metadata: {
            productId: productId.toString(),
            retainedVariantId: retained._id.toString(),
            replacedVariantId: replaced._id.toString(),
            retainedName: retained.name,
            replacedName: replaced.name,
            dependencies: {
                ...plan.dependencies,
                ...reconciled,
                pendingContributions: contributionCount,
            },
        },
        session,
    });

    await retained.populate(['variety', 'characteristics']);

    return {
        retained: serializeVariantIdentity(retained),
        replaced: {
            ...serializeVariantIdentity(replaced),
            replacementVariantId: retained._id.toString(),
        },
        dependencies: plan.dependencies,
    };
});

export {
    listProductVariantMergeCandidates,
    mergeProductVariants,
    previewProductVariantMerge,
    reconcileProductVariantDependencies,
};
