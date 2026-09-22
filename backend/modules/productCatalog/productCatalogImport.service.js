import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import { ProductCategory } from './productCategory.model.js';
import {
    attachVariantToWorkspace,
    createProductContribution,
    createVariantContribution,
} from './productCatalog.service.js';
import {
    findProductDuplicateCandidates,
    productVisibleToWorkspace,
} from './productCatalogDedup.service.js';
import {
    buildVariantSignature,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
    PRODUCT_IMPORT_STATUS,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { ProductImportSession } from './productImportSession.model.js';
import { ProductVariant } from './productVariant.model.js';
import { parseProductImportFile } from './productCatalogImport.parser.js';

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
    unit: PRODUCT_REFERENCE_UNIT.UNIT,
    u: PRODUCT_REFERENCE_UNIT.UNIT,
});

const M003_HEADER_RULES = Object.freeze([
    Object.freeze({
        kind: 'SUPPLIER',
        terms: ['fournisseur', 'supplier'],
    }),
    Object.freeze({
        kind: 'SUPPLIER_REFERENCE',
        terms: [
            'reference fournisseur',
            'ref fournisseur',
            'reference article',
            'ref article',
            'code article',
            'sku',
        ],
    }),
    Object.freeze({
        kind: 'PACKAGING',
        terms: [
            'conditionnement',
            'colisage',
            'packaging',
            'colis',
        ],
    }),
    Object.freeze({
        kind: 'PRICE',
        terms: [
            'prix',
            'tarif',
            'price',
            'cout',
        ],
    }),
    Object.freeze({
        kind: 'BRAND',
        terms: ['marque', 'brand'],
    }),
]);

const parseAliases = (value) => [
    ...new Set(
        String(value ?? '')
            .split(/[;|]/)
            .map((alias) => alias.trim())
            .filter(Boolean),
    ),
];

const parseFoodRange = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(String(value).replace(',', '.'));
    return Number.isInteger(number) && number >= 1 && number <= 5
        ? number
        : Number.NaN;
};

const parseYield = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const normalized = String(value)
        .replace('%', '')
        .replace(',', '.')
        .trim();
    const number = Number(normalized);
    return Number.isFinite(number) && number > 0 && number <= 100
        ? number
        : Number.NaN;
};

const parseReferenceUnit = (value) => {
    const normalized = normalizeProductText(value);
    return normalized ? UNIT_ALIASES[normalized] ?? null : null;
};

const detectOutOfScopeColumns = (headers) => headers.flatMap(
    (header, index) => {
        const normalizedHeader = normalizeProductText(header);
        const rule = M003_HEADER_RULES.find(({ terms }) =>
            terms.some((term) => normalizedHeader.includes(term)));

        return rule
            ? [{
                index,
                header,
                domain: 'M-003',
                kind: rule.kind,
            }]
            : [];
    },
);

const inspectProductImport = async ({
    workspaceId,
    actorId,
    file,
}) => {
    const parsed = parseProductImportFile(file);
    const outOfScopeColumns = detectOutOfScopeColumns(parsed.headers);
    const expiresAt = new Date(
        Date.now() + IMPORT_TTL_MINUTES * 60 * 1000,
    );

    const session = await ProductImportSession.create({
        workspace: workspaceId,
        actor: actorId,
        status: PRODUCT_IMPORT_STATUS.INSPECTED,
        format: parsed.format,
        headers: parsed.headers,
        rows: parsed.rows,
        outOfScopeColumns,
        expiresAt,
    });

    return {
        importId: session._id.toString(),
        format: session.format,
        headers: [...session.headers],
        rowCount: session.rows.length,
        outOfScopeColumns: [...session.outOfScopeColumns],
        expiresAt: session.expiresAt,
    };
};

const loadImportSession = async ({
    workspaceId,
    actorId,
    importId,
    allowedStatuses,
}) => {
    const session = await ProductImportSession.findOne({
        _id: importId,
        workspace: workspaceId,
        actor: actorId,
        status: mongoose.trusted({ $in: allowedStatuses }),
        expiresAt: mongoose.trusted({ $gt: new Date() }),
    });

    if (!session) {
        throw new AppError(
            'Session d’import introuvable, expirée ou déjà finalisée.',
            404,
        );
    }

    return session;
};

const mapImportRow = ({
    row,
    rowNumber,
    mapping,
    defaults,
}) => {
    const value = (key) => {
        const index = mapping[key];
        return Number.isInteger(index) ? row[index] ?? '' : '';
    };

    const name = String(value('name')).trim();
    const aliases = parseAliases(value('aliases'));
    const rawFoodRange = value('foodRange');
    const rawReferenceUnit = value('referenceUnit');
    const rawYieldPercent = value('yieldPercent');
    const foodRange = rawFoodRange === ''
        ? defaults.foodRange ?? null
        : parseFoodRange(rawFoodRange);
    const referenceUnit = rawReferenceUnit === ''
        ? defaults.referenceUnit ?? null
        : parseReferenceUnit(rawReferenceUnit);
    const yieldPercent = rawYieldPercent === ''
        ? defaults.yieldPercent ?? null
        : parseYield(rawYieldPercent);

    const errors = [];

    if (!name) errors.push('Nom Produit obligatoire.');
    if (Number.isNaN(foodRange)) errors.push('Gamme invalide.');
    if (!referenceUnit) {
        errors.push('Unité de référence obligatoire ou invalide.');
    }
    if (Number.isNaN(yieldPercent)) errors.push('Rendement invalide.');

    return {
        rowNumber,
        data: {
            name,
            aliases,
            categoryName: String(value('category')).trim() || null,
            variant: {
                form: String(value('form')).trim() || null,
                processingState: String(value('processingState')).trim() || null,
                preservation: String(value('preservation')).trim() || null,
                foodRange: Number.isNaN(foodRange) ? null : foodRange,
                referenceUnit,
                yieldPercent: Number.isNaN(yieldPercent) ? null : yieldPercent,
            },
        },
        errors,
    };
};

const buildProductImportPreview = async ({
    workspaceId,
    importSession,
    mapping,
    defaults = {},
}) => {
    const indexes = Object.values(mapping);
    if (indexes.some((index) => index >= importSession.headers.length)) {
        throw new AppError('Le mapping contient une colonne inexistante.', 400);
    }

    const categories = await ProductCategory.find({
        status: PRODUCT_CATEGORY_STATUS.ACTIVE,
    }).lean();
    const categoryByKey = new Map(
        categories.map((category) => [
            category.normalizedKey,
            category,
        ]),
    );

    const mappedRows = importSession.rows.map((row, index) => mapImportRow({
        row,
        rowNumber: index + 2,
        mapping,
        defaults,
    }));

    const requestedKeys = [
        ...new Set(
            mappedRows
                .map(({ data }) => normalizeProductText(data.name))
                .filter(Boolean),
        ),
    ];

    const exactProducts = requestedKeys.length === 0
        ? []
        : await CanonicalProduct.find({
            identityActive: true,
            searchKeys: mongoose.trusted({ $in: requestedKeys }),
        }).lean();

    const exactProductByKey = new Map();
    for (const product of exactProducts) {
        for (const key of product.searchKeys ?? []) {
            exactProductByKey.set(key, product);
        }
    }

    const variants = exactProducts.length === 0
        ? []
        : await ProductVariant.find({
            canonicalProduct: mongoose.trusted({
                $in: exactProducts.map(({ _id }) => _id),
            }),
            identityActive: true,
        }).lean();
    const variantBySignature = new Map(
        variants.map((variant) => [
            `${variant.canonicalProduct.toString()}:${variant.normalizedSignature}`,
            variant,
        ]),
    );

    const preview = [];

    for (const row of mappedRows) {
        const { data, errors } = row;

        if (errors.length > 0) {
            preview.push({
                ...row,
                classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
                candidates: [],
            });
            continue;
        }

        const category = data.categoryName
            ? categoryByKey.get(normalizeProductText(data.categoryName))
            : null;
        const warnings = [];

        if (data.categoryName && !category) {
            warnings.push(
                'Catégorie non reconnue : elle ne sera pas appliquée automatiquement.',
            );
        }

        const normalizedName = normalizeProductText(data.name);
        const exactProduct = exactProductByKey.get(normalizedName);

        if (exactProduct) {
            if (!productVisibleToWorkspace(exactProduct, workspaceId)) {
                preview.push({
                    ...row,
                    warnings,
                    classification:
                        PRODUCT_IMPORT_ROW_CLASSIFICATION.PRIVATE_CONFLICT,
                    candidates: [],
                });
                continue;
            }

            if (exactProduct.status === PRODUCT_STATUS.ARCHIVED) {
                preview.push({
                    ...row,
                    warnings,
                    errors: [
                        ...errors,
                        'Produit global archivé : nouveau rattachement interdit.',
                    ],
                    productId: exactProduct._id.toString(),
                    classification:
                        PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
                    candidates: [],
                });
                continue;
            }

            const signature = buildVariantSignature(data.variant);
            const existingVariant = variantBySignature.get(
                `${exactProduct._id.toString()}:${signature}`,
            );

            if (exactProduct.status === PRODUCT_STATUS.PENDING_REVIEW) {
                preview.push({
                    ...row,
                    data: {
                        ...data,
                        categoryId: category?._id.toString() ?? null,
                    },
                    warnings: [
                        ...warnings,
                        'Produit déjà en validation dans ce Workspace.',
                    ],
                    productId: exactProduct._id.toString(),
                    variantId: existingVariant?._id.toString() ?? null,
                    classification:
                        PRODUCT_IMPORT_ROW_CLASSIFICATION.EXISTING_PENDING,
                    candidates: [],
                });
                continue;
            }

            if (existingVariant) {
                if (
                    existingVariant.status === PRODUCT_STATUS.PENDING_REVIEW
                    && existingVariant.contributedFromWorkspace?.toString()
                        !== workspaceId.toString()
                ) {
                    preview.push({
                        ...row,
                        warnings,
                        classification:
                            PRODUCT_IMPORT_ROW_CLASSIFICATION.PRIVATE_CONFLICT,
                        candidates: [],
                    });
                    continue;
                }

                if (existingVariant.status === PRODUCT_STATUS.ARCHIVED) {
                    preview.push({
                        ...row,
                        warnings,
                        errors: [
                            ...errors,
                            'Déclinaison globale archivée : nouveau rattachement interdit.',
                        ],
                        productId: exactProduct._id.toString(),
                        variantId: existingVariant._id.toString(),
                        classification:
                            PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
                        candidates: [],
                    });
                    continue;
                }

                preview.push({
                    ...row,
                    data: {
                        ...data,
                        categoryId: category?._id.toString() ?? null,
                    },
                    warnings,
                    productId: exactProduct._id.toString(),
                    variantId: existingVariant._id.toString(),
                    classification: existingVariant.status === PRODUCT_STATUS.ACTIVE
                        ? PRODUCT_IMPORT_ROW_CLASSIFICATION.ATTACH_EXISTING
                        : PRODUCT_IMPORT_ROW_CLASSIFICATION.EXISTING_PENDING,
                    candidates: [],
                });
                continue;
            }

            preview.push({
                ...row,
                data: {
                    ...data,
                    categoryId: category?._id.toString() ?? null,
                },
                warnings,
                productId: exactProduct._id.toString(),
                classification:
                    PRODUCT_IMPORT_ROW_CLASSIFICATION.PROPOSE_VARIANT,
                candidates: [],
            });
            continue;
        }

        const duplicateCheck = await findProductDuplicateCandidates({
            name: data.name,
            aliases: data.aliases,
            workspaceId,
        });

        preview.push({
            ...row,
            data: {
                ...data,
                categoryId: category?._id.toString() ?? null,
            },
            warnings,
            classification: duplicateCheck.privateConflict
                ? PRODUCT_IMPORT_ROW_CLASSIFICATION.PRIVATE_CONFLICT
                : duplicateCheck.candidates.length > 0
                    ? PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED
                    : PRODUCT_IMPORT_ROW_CLASSIFICATION.PROPOSE_PRODUCT,
            candidates: duplicateCheck.candidates,
        });
    }

    return preview;
};

const buildPreviewCounts = (preview) => Object.fromEntries(
    Object.values(PRODUCT_IMPORT_ROW_CLASSIFICATION)
        .map((classification) => [
            classification,
            preview.filter((row) => row.classification === classification)
                .length,
        ]),
);

const previewProductImport = async ({
    workspaceId,
    actorId,
    importId,
    mapping,
    defaults = {},
}) => {
    const importSession = await loadImportSession({
        workspaceId,
        actorId,
        importId,
        allowedStatuses: [
            PRODUCT_IMPORT_STATUS.INSPECTED,
            PRODUCT_IMPORT_STATUS.PREVIEWED,
        ],
    });

    const preview = await buildProductImportPreview({
        workspaceId,
        importSession,
        mapping,
        defaults,
    });

    importSession.mapping = { mapping, defaults };
    importSession.preview = preview;
    importSession.status = PRODUCT_IMPORT_STATUS.PREVIEWED;
    await importSession.save();

    return {
        importId: importSession._id.toString(),
        headers: importSession.headers,
        rowCount: preview.length,
        counts: buildPreviewCounts(preview),
        rows: preview,
        outOfScopeColumns: [...importSession.outOfScopeColumns],
        expiresAt: importSession.expiresAt,
    };
};

const previewRowFingerprint = (row) => JSON.stringify({
    classification: row.classification,
    productId: row.productId ?? null,
    variantId: row.variantId ?? null,
    categoryId: row.data?.categoryId ?? null,
    candidates: (row.candidates ?? [])
        .map(({ id }) => id)
        .sort(),
    errors: [...(row.errors ?? [])].sort(),
});

const findStalePreviewRows = ({
    storedPreview,
    currentPreview,
}) => {
    const currentByRow = new Map(
        currentPreview.map((row) => [row.rowNumber, row]),
    );

    return storedPreview.flatMap((storedRow) => {
        const currentRow = currentByRow.get(storedRow.rowNumber);

        if (
            !currentRow
            || previewRowFingerprint(storedRow)
                !== previewRowFingerprint(currentRow)
        ) {
            return [storedRow.rowNumber];
        }

        return [];
    });
};

const assertCandidateVariant = async ({
    row,
    variantId,
}) => {
    const candidateProductIds = new Set(
        (row.candidates ?? []).map(({ id }) => id),
    );

    const variant = await ProductVariant.findOne({
        _id: variantId,
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
    }).lean();

    if (
        !variant
        || !candidateProductIds.has(variant.canonicalProduct.toString())
    ) {
        throw new AppError(
            'La déclinaison choisie ne correspond pas aux candidats revus.',
            409,
        );
    }

    return variant;
};

const commitProductImport = async ({
    workspaceId,
    actorId,
    importId,
    decisions = [],
}) => {
    const existingCommitted = await ProductImportSession.findOne({
        _id: importId,
        workspace: workspaceId,
        actor: actorId,
        status: PRODUCT_IMPORT_STATUS.COMMITTED,
    }).lean();

    if (existingCommitted) {
        return existingCommitted.committedResult;
    }

    const importSession = await ProductImportSession.findOneAndUpdate(
        {
            _id: importId,
            workspace: workspaceId,
            actor: actorId,
            status: PRODUCT_IMPORT_STATUS.PREVIEWED,
            expiresAt: mongoose.trusted({ $gt: new Date() }),
        },
        {
            $set: {
                status: PRODUCT_IMPORT_STATUS.COMMITTING,
            },
        },
        {
            returnDocument: 'after',
        },
    );

    if (!importSession) {
        const committed = await ProductImportSession.findOne({
            _id: importId,
            workspace: workspaceId,
            actor: actorId,
            status: PRODUCT_IMPORT_STATUS.COMMITTED,
        }).lean();

        if (committed) {
            return committed.committedResult;
        }

        throw new AppError(
            'Cet import est expiré, invalide ou déjà en cours de traitement.',
            409,
        );
    }

    try {
        const mappingConfig = importSession.mapping;

        if (!mappingConfig?.mapping) {
            throw new AppError(
                'La prévisualisation de cet import est incomplète.',
                409,
            );
        }

        const currentPreview = await buildProductImportPreview({
            workspaceId,
            importSession,
            mapping: mappingConfig.mapping,
            defaults: mappingConfig.defaults ?? {},
        });
        const staleRows = findStalePreviewRows({
            storedPreview: importSession.preview,
            currentPreview,
        });

        if (staleRows.length > 0) {
            importSession.preview = currentPreview;
            importSession.status = PRODUCT_IMPORT_STATUS.PREVIEWED;
            await importSession.save();

            const error = new AppError(
                'La prévisualisation est devenue obsolète. Actualisez-la avant de confirmer l’import.',
                409,
            );
            error.code = 'PRODUCT_REVIEW_OUTDATED';
            error.staleRows = staleRows;
            throw error;
        }

        const knownRows = new Set(
            currentPreview.map(({ rowNumber }) => rowNumber),
        );
        const unknownDecision = decisions.find(
            ({ rowNumber }) => !knownRows.has(rowNumber),
        );

        if (unknownDecision) {
            throw new AppError(
                'Une décision d’import cible une ligne inconnue.',
                400,
            );
        }

        const decisionByRow = new Map(
            decisions.map((decision) => [decision.rowNumber, decision]),
        );
        const results = [];

        for (const row of currentPreview) {
            const decision = decisionByRow.get(row.rowNumber);

            try {
                if (
                    row.classification === PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID
                    || row.classification === PRODUCT_IMPORT_ROW_CLASSIFICATION.PRIVATE_CONFLICT
                ) {
                    results.push({
                        rowNumber: row.rowNumber,
                        status: 'SKIPPED',
                        reason: row.classification,
                    });
                    continue;
                }

                if (decision?.action === 'SKIP') {
                    results.push({
                        rowNumber: row.rowNumber,
                        status: 'SKIPPED',
                    });
                    continue;
                }

                if (
                    row.classification
                        === PRODUCT_IMPORT_ROW_CLASSIFICATION.ATTACH_EXISTING
                ) {
                    await attachVariantToWorkspace({
                        workspaceId,
                        variantId: row.variantId,
                        actorId,
                    });
                    results.push({
                        rowNumber: row.rowNumber,
                        status: 'ATTACHED_EXISTING',
                        variantId: row.variantId,
                    });
                    continue;
                }

                if (
                    row.classification
                        === PRODUCT_IMPORT_ROW_CLASSIFICATION.EXISTING_PENDING
                ) {
                    results.push({
                        rowNumber: row.rowNumber,
                        status: 'EXISTING_PENDING',
                        variantId: row.variantId ?? null,
                    });
                    continue;
                }

                if (
                    row.classification
                        === PRODUCT_IMPORT_ROW_CLASSIFICATION.PROPOSE_VARIANT
                ) {
                    const created = await createVariantContribution({
                        workspaceId,
                        actorId,
                        productId: row.productId,
                        variant: row.data.variant,
                    });
                    results.push({
                        rowNumber: row.rowNumber,
                        status: 'PROPOSED_VARIANT',
                        variantId: created.variant.id,
                    });
                    continue;
                }

                if (
                    row.classification
                        === PRODUCT_IMPORT_ROW_CLASSIFICATION.PROPOSE_PRODUCT
                ) {
                    const created = await createProductContribution({
                        workspaceId,
                        actorId,
                        name: row.data.name,
                        aliases: row.data.aliases,
                        categoryId: row.data.categoryId,
                        reviewedCandidateIds: [],
                        variant: row.data.variant,
                    });
                    results.push({
                        rowNumber: row.rowNumber,
                        status: 'PROPOSED_PRODUCT',
                        productId: created.product.id,
                        variantId: created.variant.id,
                    });
                    continue;
                }

                if (
                    row.classification
                        === PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED
                ) {
                    if (!decision) {
                        results.push({
                            rowNumber: row.rowNumber,
                            status: 'SKIPPED',
                            reason: 'DECISION_REQUIRED',
                        });
                        continue;
                    }

                    if (decision.action === 'ATTACH_EXISTING') {
                        await assertCandidateVariant({
                            row,
                            variantId: decision.variantId,
                        });
                        await attachVariantToWorkspace({
                            workspaceId,
                            variantId: decision.variantId,
                            actorId,
                        });
                        results.push({
                            rowNumber: row.rowNumber,
                            status: 'ATTACHED_EXISTING',
                            variantId: decision.variantId,
                        });
                        continue;
                    }

                    if (decision.action === 'CREATE_NEW') {
                        const reviewedCandidateIds = row.candidates
                            .map(({ id }) => id);
                        const created = await createProductContribution({
                            workspaceId,
                            actorId,
                            name: row.data.name,
                            aliases: row.data.aliases,
                            categoryId: row.data.categoryId,
                            reviewedCandidateIds,
                            variant: row.data.variant,
                        });
                        results.push({
                            rowNumber: row.rowNumber,
                            status: 'PROPOSED_PRODUCT',
                            productId: created.product.id,
                            variantId: created.variant.id,
                        });
                        continue;
                    }
                }

                results.push({
                    rowNumber: row.rowNumber,
                    status: 'SKIPPED',
                    reason: 'UNSUPPORTED_DECISION',
                });
            } catch (error) {
                results.push({
                    rowNumber: row.rowNumber,
                    status: 'FAILED',
                    reason: error.message,
                });
            }
        }

        const committedResult = {
            importId: importSession._id.toString(),
            total: results.length,
            succeeded: results.filter(({ status }) => ![
                'FAILED',
                'SKIPPED',
            ].includes(status)).length,
            failed: results.filter(({ status }) => status === 'FAILED').length,
            skipped: results.filter(({ status }) => status === 'SKIPPED').length,
            results,
        };

        importSession.status = PRODUCT_IMPORT_STATUS.COMMITTED;
        importSession.committedAt = new Date();
        importSession.committedResult = committedResult;
        await importSession.save();

        return committedResult;
    } catch (error) {
        await ProductImportSession.updateOne(
            {
                _id: importSession._id,
                status: PRODUCT_IMPORT_STATUS.COMMITTING,
            },
            {
                $set: {
                    status: PRODUCT_IMPORT_STATUS.PREVIEWED,
                },
            },
        );

        throw error;
    }
};

export {
    buildProductImportPreview,
    commitProductImport,
    detectOutOfScopeColumns,
    inspectProductImport,
    previewProductImport,
};
