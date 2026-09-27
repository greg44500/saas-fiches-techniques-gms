import { readFile } from 'node:fs/promises';

import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    normalizeProductText,
} from '../productCatalog/productCatalog.normalization.js';
import {
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    parseProductImportFile,
} from '../productCatalog/productCatalogImport.parser.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    SupplierArticle,
} from './supplier.model.js';
import {
    SupplierCatalogEdition,
    SupplierCatalogImportSession,
    SupplierCatalogLine,
} from './supplierCatalog.model.js';
import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_CATALOG_IMPORT_STATUS,
    SUPPLIER_CATALOG_MATCH_STATUS,
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    buildSupplierCatalogEditionIdentityKey,
    buildSupplierCatalogLineIdentityKey,
    normalizeSupplierReference,
    normalizeSupplierText,
} from './supplierCatalog.normalization.js';
import {
    createSupplierCatalogEvent,
} from './supplierCatalogEvent.service.js';
import {
    createArticleInSession,
    normalizePackaging,
} from './supplierReference.service.js';
import {
    acquireCommerceLock,
    assertSupplierForCatalog,
    resolveCatalogEdition,
    upsertCatalogLineInSession,
} from './supplierCatalog.service.js';
import {
    parseDecimalFraction,
} from './supplierPriceMath.service.js';

const IMPORT_TTL_MINUTES = 30;

const UNIT_ALIASES = Object.freeze({
    g: PRODUCT_REFERENCE_UNIT.G,
    gramme: PRODUCT_REFERENCE_UNIT.G,
    grammes: PRODUCT_REFERENCE_UNIT.G,
    kg: PRODUCT_REFERENCE_UNIT.KG,
    kilogramme: PRODUCT_REFERENCE_UNIT.KG,
    kilogrammes: PRODUCT_REFERENCE_UNIT.KG,
    ml: PRODUCT_REFERENCE_UNIT.ML,
    cl: PRODUCT_REFERENCE_UNIT.CL,
    l: PRODUCT_REFERENCE_UNIT.L,
    litre: PRODUCT_REFERENCE_UNIT.L,
    litres: PRODUCT_REFERENCE_UNIT.L,
    unite: PRODUCT_REFERENCE_UNIT.UNIT,
    unité: PRODUCT_REFERENCE_UNIT.UNIT,
    unit: PRODUCT_REFERENCE_UNIT.UNIT,
    u: PRODUCT_REFERENCE_UNIT.UNIT,
});

const PRICE_BASIS_ALIASES = Object.freeze({
    colis: SUPPLIER_PRICE_BASIS.PACKAGE,
    carton: SUPPLIER_PRICE_BASIS.PACKAGE,
    sac: SUPPLIER_PRICE_BASIS.PACKAGE,
    package: SUPPLIER_PRICE_BASIS.PACKAGE,
    conditionnement:
        SUPPLIER_PRICE_BASIS.PACKAGE,
    g: SUPPLIER_PRICE_BASIS.G,
    kg: SUPPLIER_PRICE_BASIS.KG,
    ml: SUPPLIER_PRICE_BASIS.ML,
    cl: SUPPLIER_PRICE_BASIS.CL,
    l: SUPPLIER_PRICE_BASIS.L,
    unite: SUPPLIER_PRICE_BASIS.UNIT,
    unité: SUPPLIER_PRICE_BASIS.UNIT,
    unit: SUPPLIER_PRICE_BASIS.UNIT,
});

const loadImportBuffer = async (file) => {
    if (Buffer.isBuffer(file?.buffer)) {
        return file.buffer;
    }

    if (
        typeof file?.filePath === 'string'
        && file.filePath.trim()
    ) {
        return readFile(file.filePath);
    }

    throw new AppError(
        'Aucun fichier d’import valide reçu.',
        400,
    );
};

const getOriginalName = (file) => (
    file?.originalName
    ?? file?.originalname
    ?? ''
);

const parsePositiveDecimal = (value) => {
    const text = String(value ?? '')
        .replace(/\s+/g, '')
        .replace(',', '.')
        .replace('€', '')
        .trim();

    if (!text) return null;

    try {
        const parsed = parseDecimalFraction(text);

        return parsed.numerator > 0n
            ? text
            : Number.NaN;
    } catch {
        return Number.NaN;
    }
};

const parsePositiveInteger = (value) => {
    const text = String(value ?? '')
        .trim();

    if (!text) return null;

    const parsed = Number(text);

    return Number.isInteger(parsed)
        && parsed > 0
        ? parsed
        : Number.NaN;
};

const parseUnit = (value) => {
    const normalized =
        normalizeSupplierText(value);

    return normalized
        ? UNIT_ALIASES[normalized] ?? null
        : null;
};

const parsePriceBasis = (value) => {
    const normalized =
        normalizeSupplierText(value);

    return normalized
        ? PRICE_BASIS_ALIASES[normalized]
            ?? null
        : null;
};

const normalizeCurrency = (value) => {
    const normalized = String(
        value ?? '',
    ).trim().toUpperCase();

    if (!normalized) return 'EUR';

    return /^[A-Z]{3}$/.test(normalized)
        ? normalized
        : null;
};

const readMappedValue = ({
    row,
    mapping,
    key,
}) => {
    const index = mapping[key];

    return Number.isInteger(index)
        ? row[index] ?? ''
        : '';
};

const mapImportRow = ({
    row,
    rowNumber,
    mapping,
    defaults,
}) => {
    const value = (key) =>
        readMappedValue({
            row,
            mapping,
            key,
        });

    const supplierReference =
        String(
            value('supplierReference'),
        ).trim() || null;
    const designation =
        String(
            value('designation'),
        ).trim() || null;
    const brand =
        String(
            value('brand'),
        ).trim() || null;

    const unitCount =
        parsePositiveInteger(
            value('unitCount'),
        );
    const quantityPerUnit =
        parsePositiveDecimal(
            value('quantityPerUnit'),
        );
    const unit =
        parseUnit(value('unit'));
    const netWeight =
        parsePositiveDecimal(
            value('netWeight'),
        );
    const netWeightUnit =
        parseUnit(
            value('netWeightUnit'),
        );
    const drainedNetWeight =
        parsePositiveDecimal(
            value('drainedNetWeight'),
        );
    const drainedNetWeightUnit =
        parseUnit(
            value('drainedNetWeightUnit'),
        );

    const packaging = normalizePackaging({
        containerType:
            String(
                value('containerType'),
            ).trim() || null,
        unitCount:
            Number.isNaN(unitCount)
                ? null
                : unitCount,
        quantityPerUnit:
            Number.isNaN(quantityPerUnit)
                ? null
                : quantityPerUnit,
        unit,
        netWeight:
            Number.isNaN(netWeight)
                ? null
                : netWeight,
        netWeightUnit,
        drainedNetWeight:
            Number.isNaN(
                drainedNetWeight,
            )
                ? null
                : drainedNetWeight,
        drainedNetWeightUnit,
        supplierLabel:
            String(
                value('supplierLabel'),
            ).trim() || null,
    });

    const priceAmount =
        parsePositiveDecimal(
            value('priceAmount'),
        );
    const sourceBasis =
        parsePriceBasis(
            value('priceBasis'),
        )
        ?? defaults.priceBasis
        ?? null;
    const currency =
        normalizeCurrency(
            value('currency')
            || defaults.currency
            || 'EUR',
        );

    const errors = [];

    if (
        !supplierReference
        && !designation
    ) {
        errors.push(
            'Référence fournisseur ou désignation requise.',
        );
    }

    for (const [field, parsed] of [
        ['unitCount', unitCount],
        ['quantityPerUnit', quantityPerUnit],
        ['netWeight', netWeight],
        ['drainedNetWeight', drainedNetWeight],
        ['priceAmount', priceAmount],
    ]) {
        if (Number.isNaN(parsed)) {
            errors.push(
                field + ' invalide.',
            );
        }
    }

    if (
        quantityPerUnit
        && !unit
    ) {
        errors.push(
            'Unité obligatoire avec quantité par unité.',
        );
    }

    if (
        netWeight
        && !netWeightUnit
    ) {
        errors.push(
            'Unité obligatoire avec poids net.',
        );
    }

    if (
        drainedNetWeight
        && !drainedNetWeightUnit
    ) {
        errors.push(
            'Unité obligatoire avec poids net égoutté.',
        );
    }

    if (
        priceAmount
        && !sourceBasis
    ) {
        errors.push(
            'Base du prix obligatoire lorsque le prix est renseigné.',
        );
    }

    if (!currency) {
        errors.push(
            'Devise invalide.',
        );
    }

    const sourcePrice = priceAmount
        && sourceBasis
        && currency
        ? {
            amount: priceAmount,
            basis: sourceBasis,
            currency,
        }
        : null;

    return {
        rowNumber,
        supplierReference,
        normalizedSupplierReference:
            normalizeSupplierReference(
                supplierReference,
            ),
        designation,
        normalizedDesignation:
            normalizeSupplierText(
                designation,
            ),
        brand,
        packaging,
        sourcePrice,
        errors,
    };
};

const buildArticleVisibilityFilter = ({
    scope,
    workspaceId,
}) => (
    scope === SUPPLIER_SCOPE.GLOBAL_SHARED
        ? {
            scope:
                SUPPLIER_SCOPE
                    .GLOBAL_SHARED,
            workspace: null,
        }
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
        }
);

const loadExistingEditionMapping = async ({
    scope,
    workspaceId,
    supplierId,
    editionDraft,
    lineIdentityKey,
}) => {
    const identityKey =
        buildSupplierCatalogEditionIdentityKey(
            editionDraft,
        );

    const edition =
        await SupplierCatalogEdition
            .findOne({
                scope,
                workspace:
                    scope
                    === SUPPLIER_SCOPE
                        .GLOBAL_SHARED
                        ? null
                        : workspaceId,
                supplier:
                    supplierId,
                identityKey,
            })
            .select('_id')
            .lean();

    if (!edition) return null;

    const currentLine =
        await SupplierCatalogLine
            .findOne({
                catalogEdition:
                    edition._id,
                lineIdentityKey,
                isCurrent: true,
                supplierArticle: {
                    $ne: null,
                },
            })
            .select(
                'supplierArticle productVariant',
            )
            .lean();

    return currentLine
        ? {
            supplierArticleId:
                currentLine
                    .supplierArticle
                    .toString(),
            productVariantId:
                currentLine
                    .productVariant
                    ?.toString() ?? null,
        }
        : null;
};

const validateManualDecision = async ({
    decision,
    scope,
    workspaceId,
    supplierId,
}) => {
    if (!decision) return null;

    if (decision.ignore) {
        return {
            classification: 'IGNORED',
            matchStatus:
                SUPPLIER_CATALOG_MATCH_STATUS
                    .IGNORED,
            supplierArticleId: null,
            productVariantId: null,
        };
    }

    if (decision.supplierArticleId) {
        const article =
            await SupplierArticle.findOne({
                _id:
                    decision
                        .supplierArticleId,
                supplier: supplierId,
                status: 'ACTIVE',
                ...buildArticleVisibilityFilter({
                    scope,
                    workspaceId,
                }),
            })
                .select(
                    '_id productVariant',
                )
                .lean();

        if (!article) {
            throw new AppError(
                'Article fournisseur choisi introuvable.',
                409,
            );
        }

        return {
            classification: 'MATCHED',
            matchStatus:
                SUPPLIER_CATALOG_MATCH_STATUS
                    .MATCHED,
            supplierArticleId:
                article._id.toString(),
            productVariantId:
                article.productVariant
                    .toString(),
        };
    }

    if (decision.productVariantId) {
        const variant =
            await ProductVariant.findOne({
                _id:
                    decision
                        .productVariantId,
                status:
                    PRODUCT_STATUS.ACTIVE,
                identityActive: true,
            })
                .select('_id')
                .lean();

        if (!variant) {
            throw new AppError(
                'Référence Produit choisie introuvable.',
                409,
            );
        }

        return {
            classification:
                'CREATE_ARTICLE',
            matchStatus:
                SUPPLIER_CATALOG_MATCH_STATUS
                    .MATCHED,
            supplierArticleId: null,
            productVariantId:
                variant._id.toString(),
        };
    }

    return null;
};

const classifyMappedRow = async ({
    mappedRow,
    scope,
    workspaceId,
    supplierId,
    editionDraft,
    decision,
}) => {
    if (mappedRow.errors.length > 0) {
        return {
            ...mappedRow,
            classification: 'INVALID',
            matchStatus:
                SUPPLIER_CATALOG_MATCH_STATUS
                    .UNMATCHED,
            supplierArticleId: null,
            productVariantId: null,
        };
    }

    const manual =
        await validateManualDecision({
            decision,
            scope,
            workspaceId,
            supplierId,
        });

    if (manual) {
        if (
            manual.classification
                === 'CREATE_ARTICLE'
            && !mappedRow
                .supplierReference
        ) {
            return {
                ...mappedRow,
                classification: 'INVALID',
                matchStatus:
                    SUPPLIER_CATALOG_MATCH_STATUS
                        .UNMATCHED,
                supplierArticleId: null,
                productVariantId: null,
                errors: [
                    'Une référence fournisseur est obligatoire pour créer un Article.',
                ],
            };
        }

        return {
            ...mappedRow,
            ...manual,
        };
    }

    const lineIdentityKey =
        buildSupplierCatalogLineIdentityKey(
            mappedRow,
        );

    const historicMapping =
        await loadExistingEditionMapping({
            scope,
            workspaceId,
            supplierId,
            editionDraft,
            lineIdentityKey,
        });

    if (historicMapping) {
        return {
            ...mappedRow,
            classification: 'MATCHED',
            matchStatus:
                SUPPLIER_CATALOG_MATCH_STATUS
                    .MATCHED,
            ...historicMapping,
        };
    }

    if (
        mappedRow
            .normalizedSupplierReference
    ) {
        const articles =
            await SupplierArticle.find({
                supplier: supplierId,
                normalizedSupplierReference:
                    mappedRow
                        .normalizedSupplierReference,
                status: 'ACTIVE',
                ...buildArticleVisibilityFilter({
                    scope,
                    workspaceId,
                }),
            })
                .select(
                    '_id productVariant',
                )
                .limit(3)
                .lean();

        if (articles.length === 1) {
            return {
                ...mappedRow,
                classification: 'MATCHED',
                matchStatus:
                    SUPPLIER_CATALOG_MATCH_STATUS
                        .MATCHED,
                supplierArticleId:
                    articles[0]._id
                        .toString(),
                productVariantId:
                    articles[0]
                        .productVariant
                        .toString(),
            };
        }

        if (articles.length > 1) {
            return {
                ...mappedRow,
                classification: 'AMBIGUOUS',
                matchStatus:
                    SUPPLIER_CATALOG_MATCH_STATUS
                        .AMBIGUOUS,
                supplierArticleId: null,
                productVariantId: null,
            };
        }
    }

    const productVariant =
        mappedRow.normalizedDesignation
            ? await ProductVariant
                .findOne({
                    normalizedName:
                        normalizeProductText(
                            mappedRow
                                .designation,
                        ),
                    status:
                        PRODUCT_STATUS.ACTIVE,
                    identityActive: true,
                })
                .select('_id')
                .lean()
            : null;

    if (
        productVariant
        && mappedRow
            .supplierReference
    ) {
        return {
            ...mappedRow,
            classification:
                'CREATE_ARTICLE',
            matchStatus:
                SUPPLIER_CATALOG_MATCH_STATUS
                    .MATCHED,
            supplierArticleId: null,
            productVariantId:
                productVariant._id
                    .toString(),
        };
    }

    return {
        ...mappedRow,
        classification: 'UNMATCHED',
        matchStatus:
            SUPPLIER_CATALOG_MATCH_STATUS
                .UNMATCHED,
        supplierArticleId: null,
        productVariantId:
            productVariant?._id
                .toString() ?? null,
    };
};

const inspectSupplierCatalogImport = async ({
    scope,
    workspaceId = null,
    actorId,
    file,
}) => {
    const buffer =
        await loadImportBuffer(file);
    const parsed =
        parseProductImportFile({
            originalname:
                getOriginalName(file),
            buffer,
        });
    const expiresAt = new Date(
        Date.now()
        + IMPORT_TTL_MINUTES
            * 60
            * 1000,
    );

    const importSession =
        await SupplierCatalogImportSession
            .create({
                scope,
                workspace:
                    scope
                    === SUPPLIER_SCOPE
                        .GLOBAL_SHARED
                        ? null
                        : workspaceId,
                actor: actorId,
                status:
                    SUPPLIER_CATALOG_IMPORT_STATUS
                        .INSPECTED,
                format: parsed.format,
                headers: parsed.headers,
                rows: parsed.rows,
                expiresAt,
            });

    return {
        importId:
            importSession._id
                .toString(),
        scope,
        format:
            importSession.format,
        headers:
            [...importSession.headers],
        rowCount:
            importSession.rows.length,
        expiresAt:
            importSession.expiresAt,
    };
};

const loadImportSession = async ({
    scope,
    workspaceId,
    actorId,
    importId,
    allowedStatuses,
}) => {
    const importSession =
        await SupplierCatalogImportSession
            .findOne({
                _id: importId,
                scope,
                workspace:
                    scope
                    === SUPPLIER_SCOPE
                        .GLOBAL_SHARED
                        ? null
                        : workspaceId,
                actor: actorId,
                status: mongoose.trusted({
                    $in:
                        allowedStatuses,
                }),
                expiresAt:
                    mongoose.trusted({
                        $gt: new Date(),
                    }),
            });

    if (!importSession) {
        throw new AppError(
            'Session d’import introuvable, expirée ou déjà finalisée.',
            404,
        );
    }

    return importSession;
};

const previewSupplierCatalogImport = async ({
    scope,
    workspaceId = null,
    actorId,
    importId,
    supplierId,
    edition,
    mapping,
    defaults,
    decisions = [],
}) => {
    await assertSupplierForCatalog({
        scope,
        workspaceId,
        supplierId,
        session: null,
    });

    const importSession =
        await loadImportSession({
            scope,
            workspaceId,
            actorId,
            importId,
            allowedStatuses: [
                SUPPLIER_CATALOG_IMPORT_STATUS
                    .INSPECTED,
                SUPPLIER_CATALOG_IMPORT_STATUS
                    .PREVIEWED,
            ],
        });

    const decisionByRow =
        new Map(
            decisions.map(
                (decision) => [
                    decision.rowNumber,
                    decision,
                ],
            ),
        );

    const mappedRows =
        importSession.rows.map(
            (row, index) =>
                mapImportRow({
                    row,
                    rowNumber:
                        index + 2,
                    mapping,
                    defaults,
                }),
        );

    const identityKeys = new Set();
    const preview = [];

    for (const mappedRow of mappedRows) {
        const lineIdentityKey =
            buildSupplierCatalogLineIdentityKey(
                mappedRow,
            );

        if (
            identityKeys.has(
                lineIdentityKey,
            )
        ) {
            preview.push({
                ...mappedRow,
                lineIdentityKey,
                classification:
                    'INVALID',
                matchStatus:
                    SUPPLIER_CATALOG_MATCH_STATUS
                        .UNMATCHED,
                supplierArticleId: null,
                productVariantId: null,
                errors: [
                    ...mappedRow.errors,
                    'Ligne dupliquée dans le fichier importé.',
                ],
            });
            continue;
        }

        identityKeys.add(
            lineIdentityKey,
        );

        preview.push({
            ...await classifyMappedRow({
                mappedRow,
                scope,
                workspaceId,
                supplierId,
                editionDraft: edition,
                decision:
                    decisionByRow.get(
                        mappedRow
                            .rowNumber,
                    ),
            }),
            lineIdentityKey,
        });
    }

    const counts =
        preview.reduce(
            (accumulator, row) => {
                accumulator[
                    row.classification
                ] = (
                    accumulator[
                        row.classification
                    ] ?? 0
                ) + 1;

                return accumulator;
            },
            {},
        );

    importSession.supplier =
        supplierId;
    importSession.status =
        SUPPLIER_CATALOG_IMPORT_STATUS
            .PREVIEWED;
    importSession.editionDraft =
        edition;
    importSession.mapping = {
        mapping,
        defaults,
        decisions,
    };
    importSession.preview =
        preview;
    await importSession.save();

    return {
        importId:
            importSession._id
                .toString(),
        counts,
        rows: preview,
        editionIdentityKey:
            buildSupplierCatalogEditionIdentityKey(
                edition,
            ),
        expiresAt:
            importSession.expiresAt,
    };
};

const createImportedArticle = async ({
    scope,
    workspaceId,
    actorId,
    supplierId,
    row,
    session,
}) => {
    const normalizedReference =
        normalizeSupplierReference(
            row.supplierReference,
        );

    await acquireCommerceLock({
        key: [
            'supplier-article',
            scope,
            workspaceId?.toString()
                ?? 'global',
            supplierId.toString(),
            normalizedReference,
        ].join(':'),
        session,
    });

    const existing =
        await SupplierArticle.findOne({
            supplier: supplierId,
            normalizedSupplierReference:
                normalizedReference,
            status: 'ACTIVE',
            ...(scope
            === SUPPLIER_SCOPE.GLOBAL_SHARED
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
                                workspace: null,
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

    if (existing) {
        return {
            article: existing,
            created: false,
        };
    }

    const article =
        await createArticleInSession({
            scope,
            workspaceId,
            actorId,
            session,
            data: {
                supplierId,
                productVariantId:
                    row.productVariantId,
                supplierReference:
                    row.supplierReference,
                supplierDesignation:
                    row.designation,
                brand: row.brand,
                packaging:
                    row.packaging,
                provenance:
                    'Import catalogue fournisseur',
            },
        });

    return {
        article,
        created: true,
    };
};

const commitSupplierCatalogImport = async ({
    scope,
    workspaceId = null,
    actorId,
    importId,
}) => mongoose.connection.transaction(
    async (session) => {
        const importSession =
            await SupplierCatalogImportSession
                .findOne({
                    _id: importId,
                    scope,
                    workspace:
                        scope
                        === SUPPLIER_SCOPE
                            .GLOBAL_SHARED
                            ? null
                            : workspaceId,
                    actor: actorId,
                    status:
                        SUPPLIER_CATALOG_IMPORT_STATUS
                            .PREVIEWED,
                    expiresAt:
                        mongoose.trusted({
                            $gt: new Date(),
                        }),
                })
                .session(session);

        if (!importSession) {
            throw new AppError(
                'Session d’import introuvable, expirée ou non prévisualisée.',
                404,
            );
        }

        if (
            importSession.preview.some(
                ({ classification }) =>
                    classification
                    === 'INVALID',
            )
        ) {
            throw new AppError(
                'L’import contient des lignes invalides à corriger avant confirmation.',
                409,
            );
        }

        importSession.status =
            SUPPLIER_CATALOG_IMPORT_STATUS
                .COMMITTING;
        await importSession.save({
            session,
        });

        const {
            edition,
            created,
        } = await resolveCatalogEdition({
            scope,
            workspaceId,
            supplierId:
                importSession.supplier,
            actorId,
            data:
                importSession.editionDraft,
            session,
        });

        let createdArticles = 0;
        let changedLines = 0;
        let unchangedLines = 0;
        let unmatchedLines = 0;
        let ambiguousLines = 0;
        let ignoredLines = 0;

        for (
            const row
            of importSession.preview
        ) {
            if (
                row.classification
                === 'IGNORED'
            ) {
                ignoredLines += 1;
                continue;
            }

            let supplierArticleId =
                row.supplierArticleId
                    ?? null;

            if (
                row.classification
                === 'CREATE_ARTICLE'
            ) {
                const {
                    article,
                    created: articleCreated,
                } = await createImportedArticle({
                        scope,
                        workspaceId,
                        actorId,
                        supplierId:
                            importSession
                                .supplier,
                        row,
                        session,
                    });

                supplierArticleId =
                    article._id
                        .toString();
                if (articleCreated) {
                    createdArticles += 1;
                }
            }

            if (
                row.classification
                === 'UNMATCHED'
            ) {
                unmatchedLines += 1;
            }

            if (
                row.classification
                === 'AMBIGUOUS'
            ) {
                ambiguousLines += 1;
            }

            const result =
                await upsertCatalogLineInSession({
                    catalog: edition,
                    actorId,
                    session,
                    row: {
                        ...row,
                        supplierArticleId,
                    },
                });

            if (result.changed) {
                changedLines += 1;
            } else {
                unchangedLines += 1;
            }
        }

        const result = {
            catalogId:
                edition._id
                    .toString(),
            catalogCreated:
                created,
            createdArticles,
            changedLines,
            unchangedLines,
            unmatchedLines,
            ambiguousLines,
            ignoredLines,
        };

        importSession.status =
            SUPPLIER_CATALOG_IMPORT_STATUS
                .COMMITTED;
        importSession.committedResult =
            result;
        importSession.committedAt =
            new Date();
        await importSession.save({
            session,
        });

        await createSupplierCatalogEvent({
            scope,
            workspaceId:
                edition.workspace,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .IMPORT_COMMITTED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .CATALOG_EDITION,
            entityId:
                edition._id,
            metadata: result,
            session,
        });

        return result;
    },
);

export {
    commitSupplierCatalogImport,
    inspectSupplierCatalogImport,
    mapImportRow,
    previewSupplierCatalogImport,
};
