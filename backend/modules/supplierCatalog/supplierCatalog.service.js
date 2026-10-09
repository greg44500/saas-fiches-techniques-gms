import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    Supplier,
    SupplierArticle,
} from './supplier.model.js';
import {
    SupplierCatalogEdition,
    SupplierCatalogLine,
    SupplierCommerceLock,
    SupplierTariff,
} from './supplierCatalog.model.js';
import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_CATALOG_MATCH_STATUS,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    buildSupplierCatalogEditionIdentityKey,
    buildSupplierCatalogLineIdentityKey,
    normalizeSupplierReference,
    normalizeSupplierText,
} from './supplierCatalog.normalization.js';
import {
    normalizeSupplierPrice,
} from './supplierPriceMath.service.js';
import {
    createSupplierCatalogEvent,
} from './supplierCatalogEvent.service.js';
import {
    normalizePackaging,
} from './supplierReference.service.js';

const buildScopeFilter = ({
    scope,
    workspaceId,
}) => ({
    scope,
    workspace:
        scope === SUPPLIER_SCOPE.GLOBAL_SHARED
            ? null
            : workspaceId,
});

const REGEXP_SPECIAL_CHARACTERS = new Set([
    '\\',
    '^',
    '$',
    '.',
    '*',
    '+',
    '?',
    '(',
    ')',
    '[',
    ']',
    '{',
    '}',
    '|',
]);

const escapeRegExp = (value) =>
    [...value]
        .map((character) =>
            REGEXP_SPECIAL_CHARACTERS
                .has(character)
                ? '\\' + character
                : character)
        .join('');

const acquireCommerceLock = async ({
    key,
    session,
}) => SupplierCommerceLock.findOneAndUpdate(
    { key },
    {
        $inc: { version: 1 },
        $setOnInsert: { key },
    },
    {
        upsert: true,
        returnDocument: 'after',
        session,
    },
);

const assertSupplierForCatalog = async ({
    scope,
    workspaceId,
    supplierId,
    session,
}) => {
    const allowedScope = scope === SUPPLIER_SCOPE.GLOBAL_SHARED
        ? [SUPPLIER_SCOPE.GLOBAL_SHARED]
        : [
            SUPPLIER_SCOPE.GLOBAL_SHARED,
            SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        ];

    const supplier = await Supplier.findOne({
        _id: supplierId,
        scope: mongoose.trusted({
            $in: allowedScope,
        }),
        ...(scope === SUPPLIER_SCOPE.WORKSPACE_PRIVATE
            ? {
                $or: mongoose.trusted([
                    {
                        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
                        workspace: null,
                    },
                    {
                        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
                        workspace: workspaceId,
                    },
                ]),
            }
            : { workspace: null }),
        status: SUPPLIER_RESOURCE_STATUS.ACTIVE,
    }).session(session);

    if (!supplier) {
        throw new AppError(
            'Fournisseur introuvable ou archivé.',
            404,
        );
    }

    return supplier;
};

const serializeCatalogEdition = (
    edition,
    { lineCount = null } = {},
) => ({
    id: edition._id.toString(),
    scope: edition.scope,
    workspaceId:
        edition.workspace?.toString() ?? null,
    supplierId:
        edition.supplier?._id
            ? edition.supplier._id.toString()
            : edition.supplier.toString(),
    supplierName:
        edition.supplier?.name ?? null,
    name: edition.name,
    editionDate: edition.editionDate,
    validFrom: edition.validFrom,
    validTo: edition.validTo,
    source: edition.source ?? null,
    status: edition.status,
    lineCount,
    integratedAt: edition.integratedAt,
    createdAt: edition.createdAt,
    updatedAt: edition.updatedAt,
});

const decimalToString = (value) => (
    value === null || value === undefined
        ? null
        : value.toString()
);

const serializeCatalogLine = (line) => ({
    id: line._id.toString(),
    catalogEditionId:
        line.catalogEdition.toString(),
    lineIdentityKey: line.lineIdentityKey,
    revision: line.revision,
    isCurrent: line.isCurrent,
    sourceRowNumber:
        line.sourceRowNumber ?? null,
    supplierReference:
        line.supplierReference ?? null,
    designation: line.designation ?? null,
    brand: line.brand ?? null,
    packaging: line.packaging
        ? {
            containerType:
                line.packaging.containerType ?? null,
            unitCount:
                line.packaging.unitCount ?? null,
            quantityPerUnit:
                decimalToString(
                    line.packaging.quantityPerUnit,
                ),
            unit:
                line.packaging.unit ?? null,
            totalQuantity:
                decimalToString(
                    line.packaging.totalQuantity,
                ),
            netWeight:
                decimalToString(
                    line.packaging.netWeight,
                ),
            netWeightUnit:
                line.packaging.netWeightUnit ?? null,
            drainedNetWeight:
                decimalToString(
                    line.packaging.drainedNetWeight,
                ),
            drainedNetWeightUnit:
                line.packaging
                    .drainedNetWeightUnit ?? null,
            supplierLabel:
                line.packaging.supplierLabel ?? null,
        }
        : null,
    sourcePrice: line.sourcePrice
        ? {
            amount:
                decimalToString(
                    line.sourcePrice.amount,
                ),
            basis: line.sourcePrice.basis,
            currency:
                line.sourcePrice.currency,
        }
        : null,
    supplierArticleId:
        line.supplierArticle?.toString() ?? null,
    productVariantId:
        line.productVariant?.toString() ?? null,
    matchStatus: line.matchStatus,
    provenance: line.provenance ?? null,
    createdAt: line.createdAt,
});

const buildCatalogLockKey = ({
    scope,
    workspaceId,
    supplierId,
    identityKey,
}) => [
    'catalog',
    scope,
    workspaceId?.toString() ?? 'global',
    supplierId.toString(),
    identityKey,
].join(':');

const resolveCatalogEdition = async ({
    scope,
    workspaceId,
    supplierId,
    actorId,
    data,
    session,
}) => {
    const supplier = await assertSupplierForCatalog({
        scope,
        workspaceId,
        supplierId,
        session,
    });
    const identityKey =
        buildSupplierCatalogEditionIdentityKey(data);

    await acquireCommerceLock({
        key: buildCatalogLockKey({
            scope,
            workspaceId,
            supplierId,
            identityKey,
        }),
        session,
    });

    const scopeFilter = buildScopeFilter({
        scope,
        workspaceId,
    });

    let edition =
        await SupplierCatalogEdition.findOne({
            ...scopeFilter,
            supplier: supplier._id,
            identityKey,
        }).session(session);

    if (edition) {
        return {
            edition,
            supplier,
            created: false,
        };
    }

    [edition] =
        await SupplierCatalogEdition.create([
            {
                ...scopeFilter,
                supplier: supplier._id,
                name: data.name,
                normalizedName:
                    normalizeSupplierText(data.name),
                identityKey,
                editionDate:
                    data.editionDate ?? null,
                validFrom:
                    data.validFrom ?? null,
                validTo:
                    data.validTo ?? null,
                source: data.source ?? null,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

    await createSupplierCatalogEvent({
        scope,
        workspaceId: edition.workspace,
        actorId,
        action:
            SUPPLIER_CATALOG_EVENT_ACTION
                .CATALOG_CREATED,
        entityType:
            SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                .CATALOG_EDITION,
        entityId: edition._id,
        metadata: {
            supplierId:
                supplier._id.toString(),
        },
        session,
    });

    return {
        edition,
        supplier,
        created: true,
    };
};

const createCatalogEdition = async (params) =>
    mongoose.connection.transaction(
        async (session) => {
            const result =
                await resolveCatalogEdition({
                    ...params,
                    session,
                });

            await result.edition.populate({
                path: 'supplier',
                select: '_id name',
            });

            return {
                catalog:
                    serializeCatalogEdition(
                        result.edition,
                    ),
                created: result.created,
            };
        },
    );

const listCatalogEditions = async ({
    scope,
    workspaceId = null,
    globalOnly = false,
    supplierId = null,
    status =
        SUPPLIER_RESOURCE_STATUS.ACTIVE,
    page = 1,
    limit = 20,
}) => {
    const filter = globalOnly
        ? {
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            workspace: null,
        }
        : scope
            ? buildScopeFilter({
                scope,
                workspaceId,
            })
            : {
                $or: mongoose.trusted([
                    {
                        scope:
                            SUPPLIER_SCOPE
                                .GLOBAL_SHARED,
                        workspace: null,
                    },
                    {
                        scope:
                            SUPPLIER_SCOPE
                                .WORKSPACE_PRIVATE,
                        workspace: workspaceId,
                    },
                ]),
            };

    if (supplierId) {
        filter.supplier = supplierId;
    }
    if (status) {
        filter.status = status;
    }

    const skip = (page - 1) * limit;
    const [editions, total] =
        await Promise.all([
            SupplierCatalogEdition.find(filter)
                .populate({
                    path: 'supplier',
                    select: '_id name',
                })
                .sort({
                    integratedAt: -1,
                    _id: -1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),
            SupplierCatalogEdition
                .countDocuments(filter),
        ]);

    const lineCounts = editions.length > 0
        ? await SupplierCatalogLine.aggregate([
            {
                $match: {
                    catalogEdition: {
                        $in: editions.map(
                            ({ _id }) => _id,
                        ),
                    },
                    isCurrent: true,
                },
            },
            {
                $group: {
                    _id: '$catalogEdition',
                    count: { $sum: 1 },
                },
            },
        ])
        : [];

    const lineCountByCatalog = new Map(
        lineCounts.map(({ _id, count }) => [
            _id.toString(),
            count,
        ]),
    );

    return {
        catalogs:
            editions.map(
                (edition) =>
                    serializeCatalogEdition(
                        edition,
                        {
                            lineCount:
                                lineCountByCatalog
                                    .get(
                                        edition._id
                                            .toString(),
                                    ) ?? 0,
                        },
                    ),
            ),
        pagination: {
            page,
            limit,
            total,
            totalPages:
                Math.ceil(total / limit),
        },
    };
};

const findScopedCatalogEdition = async ({
    scope,
    workspaceId,
    catalogId,
    session = null,
    allowGlobalVisibility = false,
}) => {
    const filter = allowGlobalVisibility
        ? {
            _id: catalogId,
            $or: mongoose.trusted([
                {
                    scope:
                        SUPPLIER_SCOPE
                            .GLOBAL_SHARED,
                    workspace: null,
                },
                {
                    scope:
                        SUPPLIER_SCOPE
                            .WORKSPACE_PRIVATE,
                    workspace: workspaceId,
                },
            ]),
        }
        : {
            _id: catalogId,
            ...buildScopeFilter({
                scope,
                workspaceId,
            }),
        };

    const catalog =
        await SupplierCatalogEdition
            .findOne(filter)
            .session(session);

    if (!catalog) {
        throw new AppError(
            'Catalogue fournisseur introuvable.',
            404,
        );
    }

    return catalog;
};

const updateCatalogStatus = async ({
    scope,
    workspaceId = null,
    catalogId,
    actorId,
    status,
}) => mongoose.connection.transaction(
    async (session) => {
        const catalog =
            await findScopedCatalogEdition({
                scope,
                workspaceId,
                catalogId,
                session,
            });

        if (catalog.status === status) {
            return serializeCatalogEdition(
                catalog,
            );
        }

        catalog.status = status;
        catalog.updatedBy = actorId;
        await catalog.save({ session });

        if (
            status
            === SUPPLIER_RESOURCE_STATUS.ARCHIVED
        ) {
            await createSupplierCatalogEvent({
                scope,
                workspaceId:
                    catalog.workspace,
                actorId,
                action:
                    SUPPLIER_CATALOG_EVENT_ACTION
                        .CATALOG_ARCHIVED,
                entityType:
                    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                        .CATALOG_EDITION,
                entityId: catalog._id,
                session,
            });
        }

        return serializeCatalogEdition(
            catalog,
        );
    },
);

const listCatalogLines = async ({
    workspaceId = null,
    globalOnly = false,
    catalogId,
    page = 1,
    limit = 50,
    search,
    matchStatus,
}) => {
    const catalog = globalOnly
        ? await findScopedCatalogEdition({
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            catalogId,
        })
        : await findScopedCatalogEdition({
            workspaceId,
            catalogId,
            allowGlobalVisibility: true,
        });

    await catalog.populate({
        path: 'supplier',
        select: '_id name',
    });

    const baseFilter = {
        catalogEdition: catalog._id,
        isCurrent: true,
    };
    const filter = { ...baseFilter };

    if (matchStatus) {
        filter.matchStatus = matchStatus;
    }

    if (search) {
        const normalizedText =
            normalizeSupplierText(search);
        const normalizedReference =
            normalizeSupplierReference(search);
        const escapedRaw =
            escapeRegExp(search.trim());
        const conditions = [];

        if (normalizedReference) {
            conditions.push({
                normalizedSupplierReference:
                    new RegExp(
                        escapeRegExp(
                            normalizedReference,
                        ),
                    ),
            });
        }
        if (normalizedText) {
            conditions.push({
                normalizedDesignation:
                    new RegExp(
                        escapeRegExp(
                            normalizedText,
                        ),
                    ),
            });
        }
        if (escapedRaw) {
            conditions.push({
                brand:
                    new RegExp(
                        escapedRaw,
                        'i',
                    ),
            });
        }

        if (conditions.length > 0) {
            filter.$or =
                mongoose.trusted(
                    conditions,
                );
        }
    }

    const skip = (page - 1) * limit;

    const [lines, total, catalogLineCount] =
        await Promise.all([
            SupplierCatalogLine
                .find(filter)
                .sort({
                    sourceRowNumber: 1,
                    _id: 1,
                })
                .skip(skip)
                .limit(limit)
                .lean(),
            SupplierCatalogLine
                .countDocuments(filter),
            SupplierCatalogLine
                .countDocuments(baseFilter),
        ]);

    return {
        catalog:
            serializeCatalogEdition(
                catalog,
                {
                    lineCount:
                        catalogLineCount,
                },
            ),
        lines:
            lines.map(
                serializeCatalogLine,
            ),
        pagination: {
            page,
            limit,
            total,
            totalPages:
                Math.ceil(total / limit),
        },
    };
};

const lineFingerprint = (value) => JSON.stringify({
    supplierReference:
        value.supplierReference ?? null,
    designation:
        value.designation ?? null,
    brand: value.brand ?? null,
    packaging: value.packaging ?? null,
    sourcePrice:
        value.sourcePrice ?? null,
    supplierArticleId:
        value.supplierArticleId ?? null,
    productVariantId:
        value.productVariantId ?? null,
    matchStatus: value.matchStatus,
    provenance:
        value.provenance ?? null,
});

const currentLineFingerprint = (line) =>
    lineFingerprint({
        supplierReference:
            line.supplierReference,
        designation:
            line.designation,
        brand: line.brand,
        packaging: line.packaging
            ? {
                containerType:
                    line.packaging
                        .containerType ?? null,
                unitCount:
                    line.packaging
                        .unitCount ?? null,
                quantityPerUnit:
                    decimalToString(
                        line.packaging
                            .quantityPerUnit,
                    ),
                unit:
                    line.packaging.unit ?? null,
                totalQuantity:
                    decimalToString(
                        line.packaging
                            .totalQuantity,
                    ),
                netWeight:
                    decimalToString(
                        line.packaging
                            .netWeight,
                    ),
                netWeightUnit:
                    line.packaging
                        .netWeightUnit ?? null,
                drainedNetWeight:
                    decimalToString(
                        line.packaging
                            .drainedNetWeight,
                    ),
                drainedNetWeightUnit:
                    line.packaging
                        .drainedNetWeightUnit
                        ?? null,
                supplierLabel:
                    line.packaging
                        .supplierLabel ?? null,
            }
            : null,
        sourcePrice: line.sourcePrice
            ? {
                amount:
                    decimalToString(
                        line.sourcePrice.amount,
                    ),
                basis:
                    line.sourcePrice.basis,
                currency:
                    line.sourcePrice.currency,
            }
            : null,
        supplierArticleId:
            line.supplierArticle
                ?.toString() ?? null,
        productVariantId:
            line.productVariant
                ?.toString() ?? null,
        matchStatus:
            line.matchStatus,
        provenance:
            line.provenance ?? null,
    });

const tariffFingerprint = (value) =>
    JSON.stringify({
        sourceAmount: value.sourceAmount,
        sourceBasis: value.sourceBasis,
        currency: value.currency,
        normalizedAmount:
            value.normalizedAmount ?? null,
        normalizedUnit:
            value.normalizedUnit ?? null,
        validFrom:
            value.validFrom
                ? new Date(
                    value.validFrom,
                ).toISOString()
                : null,
        validTo:
            value.validTo
                ? new Date(
                    value.validTo,
                ).toISOString()
                : null,
        provenance:
            value.provenance ?? null,
    });

const currentTariffFingerprint = (tariff) =>
    tariffFingerprint({
        sourceAmount:
            decimalToString(
                tariff.sourceAmount,
            ),
        sourceBasis:
            tariff.sourceBasis,
        currency: tariff.currency,
        normalizedAmount:
            decimalToString(
                tariff.normalizedAmount,
            ),
        normalizedUnit:
            tariff.normalizedUnit,
        validFrom: tariff.validFrom,
        validTo: tariff.validTo,
        provenance:
            tariff.provenance,
    });

const resolveArticleTargetUnit = async ({
    supplierArticleId,
    session,
}) => {
    const article =
        await SupplierArticle.findById(
            supplierArticleId,
        ).session(session);

    if (!article) return null;

    const variant =
        await ProductVariant.findOne({
            _id: article.productVariant,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
        }).session(session);

    return variant?.referenceUnit ?? null;
};

const upsertCurrentTariffInSession = async ({
    catalog,
    catalogLine,
    supplierArticleId,
    actorId,
    sourcePrice,
    packaging,
    session,
}) => {
    if (
        !supplierArticleId
        || !sourcePrice
    ) {
        return null;
    }

    const targetUnit =
        await resolveArticleTargetUnit({
            supplierArticleId,
            session,
        });

    const normalized =
        targetUnit
            ? normalizeSupplierPrice({
                sourceAmount:
                    sourcePrice.amount,
                sourceBasis:
                    sourcePrice.basis,
                packaging,
                targetUnit,
            })
            : {
                normalizedAmount: null,
                normalizedUnit: null,
            };

    const next = {
        sourceAmount:
            String(sourcePrice.amount),
        sourceBasis:
            sourcePrice.basis,
        currency:
            sourcePrice.currency ?? 'EUR',
        normalizedAmount:
            normalized.normalizedAmount,
        normalizedUnit:
            normalized.normalizedUnit,
        validFrom:
            catalog.validFrom,
        validTo:
            catalog.validTo,
        provenance:
            catalog.source,
    };

    const current =
        await SupplierTariff.findOne({
            catalogEdition: catalog._id,
            supplierArticle:
                supplierArticleId,
            isCurrent: true,
        }).session(session);

    if (
        current
        && currentTariffFingerprint(current)
            === tariffFingerprint(next)
    ) {
        return current;
    }

    const revision = current
        ? current.revision + 1
        : 1;

    if (current) {
        current.isCurrent = false;
        current.updatedBy = actorId;
        await current.save({ session });
    }

    const [tariff] =
        await SupplierTariff.create([
            {
                catalogEdition:
                    catalog._id,
                catalogLine:
                    catalogLine._id,
                supplierArticle:
                    supplierArticleId,
                scope: catalog.scope,
                workspace:
                    catalog.workspace,
                revision,
                isCurrent: true,
                ...next,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

    return tariff;
};

const upsertCatalogLineInSession = async ({
    catalog,
    actorId,
    row,
    session,
}) => {
    const packaging =
        normalizePackaging(
            row.packaging,
        );
    const lineIdentityKey =
        row.lineIdentityKey
        ?? buildSupplierCatalogLineIdentityKey({
            supplierReference:
                row.supplierReference,
            designation:
                row.designation,
            brand: row.brand,
            packaging,
        });

    const next = {
        supplierReference:
            row.supplierReference ?? null,
        designation:
            row.designation ?? null,
        brand: row.brand ?? null,
        packaging,
        sourcePrice:
            row.sourcePrice ?? null,
        supplierArticleId:
            row.supplierArticleId ?? null,
        productVariantId:
            row.productVariantId ?? null,
        matchStatus:
            row.matchStatus
            ?? SUPPLIER_CATALOG_MATCH_STATUS
                .UNMATCHED,
        provenance:
            row.provenance ?? null,
    };

    const current =
        await SupplierCatalogLine.findOne({
            catalogEdition: catalog._id,
            lineIdentityKey,
            isCurrent: true,
        }).session(session);

    if (
        current
        && currentLineFingerprint(current)
            === lineFingerprint(next)
    ) {
        await upsertCurrentTariffInSession({
            catalog,
            catalogLine: current,
            supplierArticleId:
                next.supplierArticleId,
            actorId,
            sourcePrice:
                next.sourcePrice,
            packaging,
            session,
        });

        return {
            line: current,
            changed: false,
        };
    }

    const revision = current
        ? current.revision + 1
        : 1;

    if (current) {
        current.isCurrent = false;
        current.updatedBy = actorId;
        await current.save({ session });
    }

    const [line] =
        await SupplierCatalogLine.create([
            {
                catalogEdition:
                    catalog._id,
                scope: catalog.scope,
                workspace:
                    catalog.workspace,
                lineIdentityKey,
                revision,
                isCurrent: true,
                sourceRowNumber:
                    row.sourceRowNumber
                    ?? null,
                supplierReference:
                    next.supplierReference,
                normalizedSupplierReference:
                    normalizeSupplierReference(
                        next.supplierReference,
                    ),
                designation:
                    next.designation,
                normalizedDesignation:
                    normalizeSupplierText(
                        next.designation,
                    ),
                brand: next.brand,
                packaging,
                sourcePrice:
                    next.sourcePrice,
                supplierArticle:
                    next.supplierArticleId,
                productVariant:
                    next.productVariantId,
                matchStatus:
                    next.matchStatus,
                provenance:
                    next.provenance,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

    await upsertCurrentTariffInSession({
        catalog,
        catalogLine: line,
        supplierArticleId:
            next.supplierArticleId,
        actorId,
        sourcePrice:
            next.sourcePrice,
        packaging,
        session,
    });

    return {
        line,
        changed: true,
    };
};

const upsertCatalogLine = async ({
    scope,
    workspaceId = null,
    catalogId,
    actorId,
    row,
}) => mongoose.connection.transaction(
    async (session) => {
        const catalog =
            await findScopedCatalogEdition({
                scope,
                workspaceId,
                catalogId,
                session,
            });

        if (
            catalog.status
            !== SUPPLIER_RESOURCE_STATUS.ACTIVE
        ) {
            throw new AppError(
                'Le catalogue est archivé.',
                409,
            );
        }

        const preparedRow = { ...row };

        if (row.supplierArticleId) {
            const article =
                await SupplierArticle.findOne({
                    _id:
                        row.supplierArticleId,
                    supplier:
                        catalog.supplier,
                    status:
                        SUPPLIER_RESOURCE_STATUS
                            .ACTIVE,
                    ...(scope
                    === SUPPLIER_SCOPE
                        .GLOBAL_SHARED
                        ? {
                            scope:
                                SUPPLIER_SCOPE
                                    .GLOBAL_SHARED,
                            workspace: null,
                        }
                        : {
                            $or:
                                mongoose.trusted([
                                    {
                                        scope:
                                            SUPPLIER_SCOPE
                                                .GLOBAL_SHARED,
                                        workspace:
                                            null,
                                    },
                                    {
                                        scope:
                                            SUPPLIER_SCOPE
                                                .WORKSPACE_PRIVATE,
                                        workspace:
                                            workspaceId,
                                    },
                                ]),
                        }),
                }).session(session);

            if (!article) {
                throw new AppError(
                    'Article fournisseur introuvable pour ce catalogue.',
                    404,
                );
            }

            preparedRow.productVariantId =
                article.productVariant;
            preparedRow.matchStatus =
                SUPPLIER_CATALOG_MATCH_STATUS
                    .MATCHED;
        } else if (row.productVariantId) {
            const variant =
                await ProductVariant.findOne({
                    _id:
                        row.productVariantId,
                    status:
                        PRODUCT_STATUS.ACTIVE,
                    identityActive: true,
                }).session(session);

            if (!variant) {
                throw new AppError(
                    'Référence Produit introuvable.',
                    404,
                );
            }
        }

        const result =
            await upsertCatalogLineInSession({
                catalog,
                actorId,
                row: preparedRow,
                session,
            });

        return {
            line: serializeCatalogLine(
                result.line,
            ),
            changed: result.changed,
        };
    },
);

export {
    acquireCommerceLock,
    assertSupplierForCatalog,
    createCatalogEdition,
    findScopedCatalogEdition,
    listCatalogEditions,
    listCatalogLines,
    resolveCatalogEdition,
    serializeCatalogEdition,
    serializeCatalogLine,
    updateCatalogStatus,
    upsertCatalogLine,
    upsertCatalogLineInSession,
};
