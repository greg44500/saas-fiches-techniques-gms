import { readFile } from 'node:fs/promises';

import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import { ProductCategory } from './productCategory.model.js';
import {
    attachVariantToWorkspace,
    createWorkspaceProduct,
    createWorkspaceVariant,
} from './productCatalog.service.js';
import {
    createGlobalProduct,
    createGlobalVariant,
} from './productCatalogGovernance.service.js';
import {
    findProductDuplicateCandidates,
} from './productCatalogDedup.service.js';
import {
    buildVariantSignature,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_FOOD_RANGES,
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_IMPORT_STATUS,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { ProductImportSession } from './productImportSession.model.js';
import { ProductVariant } from './productVariant.model.js';
import {
    resolveProductProcessingState,
} from './productVariantSemantics.js';
import { parseProductImportFile } from './productCatalogImport.parser.js';

const IMPORT_TTL_MINUTES = 30;

const loadProductImportBuffer = async (file) => {
    if (Buffer.isBuffer(file?.buffer)) return file.buffer;

    if (typeof file?.filePath === 'string' && file.filePath.trim()) {
        return readFile(file.filePath);
    }

    throw new AppError('Aucun fichier d’import valide reçu.', 400);
};

const getProductImportOriginalName = (file) => (
    file?.originalName
    ?? file?.originalname
    ?? ''
);

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
        terms: ['conditionnement', 'colisage', 'packaging', 'colis'],
    }),
    Object.freeze({
        kind: 'PRICE',
        terms: ['prix', 'tarif', 'price', 'cout'],
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
    return Number.isInteger(number) && PRODUCT_FOOD_RANGES.includes(number)
        ? number
        : Number.NaN;
};

const parseYield = (value) => {
    if (value === '' || value === null || value === undefined) return null;

    const number = Number(
        String(value)
            .replace('%', '')
            .replace(',', '.')
            .trim(),
    );

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

const buildImportScopeFilter = ({
    scope,
    workspaceId,
}) => (
    scope === PRODUCT_IMPORT_SCOPE.GLOBAL
        ? {
            scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
            workspace: null,
        }
        : {
            scope: PRODUCT_IMPORT_SCOPE.WORKSPACE,
            workspace: workspaceId,
        }
);

const inspectProductImport = async ({
    scope = PRODUCT_IMPORT_SCOPE.WORKSPACE,
    workspaceId = null,
    actorId,
    file,
}) => {
    if (scope === PRODUCT_IMPORT_SCOPE.WORKSPACE && !workspaceId) {
        throw new AppError('Workspace requis pour cet import.', 400);
    }

    const buffer = await loadProductImportBuffer(file);
    const parsed = parseProductImportFile({
        originalname: getProductImportOriginalName(file),
        buffer,
    });
    const outOfScopeColumns = detectOutOfScopeColumns(parsed.headers);
    const expiresAt = new Date(
        Date.now() + IMPORT_TTL_MINUTES * 60 * 1000,
    );

    const session = await ProductImportSession.create({
        scope,
        workspace: scope === PRODUCT_IMPORT_SCOPE.WORKSPACE
            ? workspaceId
            : null,
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
        scope: session.scope,
        format: session.format,
        headers: [...session.headers],
        rowCount: session.rows.length,
        outOfScopeColumns: [...session.outOfScopeColumns],
        expiresAt: session.expiresAt,
    };
};

const loadImportSession = async ({
    scope,
    workspaceId,
    actorId,
    importId,
    allowedStatuses,
}) => {
    const session = await ProductImportSession.findOne({
        _id: importId,
        ...buildImportScopeFilter({ scope, workspaceId }),
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
    if (foodRange === null || Number.isNaN(foodRange)) {
        errors.push('Gamme obligatoire ou invalide.');
    }
    if (!referenceUnit) {
        errors.push('Unité de référence obligatoire ou invalide.');
    }
    if (Number.isNaN(yieldPercent)) errors.push('Rendement invalide.');

    const presentation = String(value('presentation')).trim() || null;
    const requestedProcessingState = String(
        value('processingState'),
    ).trim() || null;
    const processingState = (
        foodRange === null || Number.isNaN(foodRange)
            ? { valid: false, value: requestedProcessingState }
            : resolveProductProcessingState({
                foodRange,
                processingState: requestedProcessingState,
            })
    );

    if (foodRange !== null && !Number.isNaN(foodRange) && !processingState.valid) {
        errors.push(
            'État / transformation incompatible avec la gamme sélectionnée.',
        );
    }

    return {
        rowNumber,
        data: {
            name,
            aliases,
            categoryName: String(value('category')).trim() || null,
            variant: {
                presentation,
                processingState: processingState.value,
                foodRange: Number.isNaN(foodRange) ? null : foodRange,
                referenceUnit,
                yieldPercent: Number.isNaN(yieldPercent) ? null : yieldPercent,
            },
        },
        errors,
    };
};

const buildProductImportPreview = async ({
    scope = PRODUCT_IMPORT_SCOPE.WORKSPACE,
    workspaceId = null,
    importSession,
    mapping,
    defaults = {},
}) => {
    void scope;

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
    const defaultCategory = defaults.categoryId
        ? categories.find(
            ({ _id }) => _id.toString() === defaults.categoryId.toString(),
        ) ?? null
        : null;

    if (defaults.categoryId && !defaultCategory) {
        throw new AppError('Catégorie par défaut indisponible.', 409);
    }

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
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
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
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
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

        const namedCategory = data.categoryName
            ? categoryByKey.get(normalizeProductText(data.categoryName))
            : null;
        const category = namedCategory ?? defaultCategory;
        const warnings = [];

        if (data.categoryName && !namedCategory) {
            warnings.push(
                'Catégorie non reconnue : la catégorie par défaut sera utilisée si elle est définie.',
            );
        }

        const normalizedName = normalizeProductText(data.name);
        const exactProduct = exactProductByKey.get(normalizedName);

        if (exactProduct) {
            if (exactProduct.status === PRODUCT_STATUS.ARCHIVED) {
                preview.push({
                    ...row,
                    data: {
                        ...data,
                        categoryId: category?._id.toString() ?? null,
                    },
                    warnings,
                    errors: [
                        ...errors,
                        'Produit global archivé : nouveau rattachement interdit.',
                    ],
                    productId: exactProduct._id.toString(),
                    classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
                    candidates: [],
                });
                continue;
            }

            const signature = buildVariantSignature(data.variant);
            const existingVariant = variantBySignature.get(
                `${exactProduct._id.toString()}:${signature}`,
            );

            if (existingVariant) {
                if (existingVariant.status === PRODUCT_STATUS.ARCHIVED) {
                    preview.push({
                        ...row,
                        data: {
                            ...data,
                            categoryId: category?._id.toString() ?? null,
                        },
                        warnings,
                        errors: [
                            ...errors,
                            'Déclinaison globale archivée : nouveau rattachement interdit.',
                        ],
                        productId: exactProduct._id.toString(),
                        variantId: existingVariant._id.toString(),
                        classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
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
                    classification:
                        PRODUCT_IMPORT_ROW_CLASSIFICATION.ATTACH_EXISTING,
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
                classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_VARIANT,
                candidates: [],
            });
            continue;
        }

        const duplicateCheck = await findProductDuplicateCandidates({
            name: data.name,
            aliases: data.aliases,
            workspaceId,
        });

        const preparedRow = {
            ...row,
            data: {
                ...data,
                categoryId: category?._id.toString() ?? null,
            },
            warnings,
            candidates: duplicateCheck.candidates,
        };

        if (duplicateCheck.candidates.length > 0) {
            if (!category) {
                preparedRow.warnings = [
                    ...warnings,
                    'Une catégorie active sera obligatoire si vous choisissez de créer une nouvelle référence.',
                ];
            }

            preview.push({
                ...preparedRow,
                classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED,
            });
            continue;
        }

        if (!category) {
            preview.push({
                ...preparedRow,
                errors: [
                    ...errors,
                    'Une catégorie active est obligatoire pour créer un Produit.',
                ],
                classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
            });
            continue;
        }

        preview.push({
            ...preparedRow,
            classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT,
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
    scope = PRODUCT_IMPORT_SCOPE.WORKSPACE,
    workspaceId = null,
    actorId,
    importId,
    mapping,
    defaults = {},
}) => {
    const importSession = await loadImportSession({
        scope,
        workspaceId,
        actorId,
        importId,
        allowedStatuses: [
            PRODUCT_IMPORT_STATUS.INSPECTED,
            PRODUCT_IMPORT_STATUS.PREVIEWED,
        ],
    });

    const preview = await buildProductImportPreview({
        scope,
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
        scope: importSession.scope,
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

        return (
            !currentRow
            || previewRowFingerprint(storedRow)
                !== previewRowFingerprint(currentRow)
        )
            ? [storedRow.rowNumber]
            : [];
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

const useExistingVariant = async ({
    scope,
    workspaceId,
    actorId,
    variantId,
}) => {
    if (scope === PRODUCT_IMPORT_SCOPE.GLOBAL) {
        return {
            status: 'EXISTING_REFERENCE',
            variantId,
        };
    }

    await attachVariantToWorkspace({
        workspaceId,
        variantId,
        actorId,
    });

    return {
        status: 'ATTACHED_EXISTING',
        variantId,
    };
};

const createVariantFromImport = async ({
    scope,
    workspaceId,
    actorId,
    productId,
    variant,
}) => {
    if (scope === PRODUCT_IMPORT_SCOPE.GLOBAL) {
        const created = await createGlobalVariant({
            actorId,
            productId,
            variant,
        });
        return {
            status: 'CREATED_VARIANT',
            variantId: created.id,
        };
    }

    const created = await createWorkspaceVariant({
        workspaceId,
        actorId,
        productId,
        variant,
    });

    return {
        status: 'CREATED_VARIANT',
        variantId: created.variant.id,
    };
};

const createProductFromImport = async ({
    scope,
    workspaceId,
    actorId,
    row,
    reviewedCandidateIds,
}) => {
    if (!row.data.categoryId) {
        throw new AppError(
            'Une catégorie active est obligatoire pour créer le Produit.',
            409,
        );
    }

    const payload = {
        actorId,
        name: row.data.name,
        aliases: row.data.aliases,
        categoryId: row.data.categoryId,
        reviewedCandidateIds,
        variant: row.data.variant,
    };

    if (scope === PRODUCT_IMPORT_SCOPE.GLOBAL) {
        const created = await createGlobalProduct(payload);
        return {
            status: 'CREATED_PRODUCT',
            productId: created.product.id,
            variantId: created.variant.id,
        };
    }

    const created = await createWorkspaceProduct({
        ...payload,
        workspaceId,
    });

    return {
        status: 'CREATED_PRODUCT',
        productId: created.product.id,
        variantId: created.variant.id,
    };
};

const commitProductImport = async ({
    scope = PRODUCT_IMPORT_SCOPE.WORKSPACE,
    workspaceId = null,
    actorId,
    importId,
    decisions = [],
}) => {
    const scopeFilter = buildImportScopeFilter({ scope, workspaceId });
    const existingCommitted = await ProductImportSession.findOne({
        _id: importId,
        ...scopeFilter,
        actor: actorId,
        status: PRODUCT_IMPORT_STATUS.COMMITTED,
    }).lean();

    if (existingCommitted) {
        return existingCommitted.committedResult;
    }

    const importSession = await ProductImportSession.findOneAndUpdate(
        {
            _id: importId,
            ...scopeFilter,
            actor: actorId,
            status: PRODUCT_IMPORT_STATUS.PREVIEWED,
            expiresAt: mongoose.trusted({ $gt: new Date() }),
        },
        {
            $set: { status: PRODUCT_IMPORT_STATUS.COMMITTING },
        },
        { returnDocument: 'after' },
    );

    if (!importSession) {
        const committed = await ProductImportSession.findOne({
            _id: importId,
            ...scopeFilter,
            actor: actorId,
            status: PRODUCT_IMPORT_STATUS.COMMITTED,
        }).lean();

        if (committed) return committed.committedResult;

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
            scope,
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
                if (row.classification === PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID) {
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
                    results.push({
                        rowNumber: row.rowNumber,
                        ...await useExistingVariant({
                            scope,
                            workspaceId,
                            actorId,
                            variantId: row.variantId,
                        }),
                    });
                    continue;
                }

                if (
                    row.classification
                    === PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_VARIANT
                ) {
                    results.push({
                        rowNumber: row.rowNumber,
                        ...await createVariantFromImport({
                            scope,
                            workspaceId,
                            actorId,
                            productId: row.productId,
                            variant: row.data.variant,
                        }),
                    });
                    continue;
                }

                if (
                    row.classification
                    === PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT
                ) {
                    results.push({
                        rowNumber: row.rowNumber,
                        ...await createProductFromImport({
                            scope,
                            workspaceId,
                            actorId,
                            row,
                            reviewedCandidateIds: [],
                        }),
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

                        results.push({
                            rowNumber: row.rowNumber,
                            ...await useExistingVariant({
                                scope,
                                workspaceId,
                                actorId,
                                variantId: decision.variantId,
                            }),
                        });
                        continue;
                    }

                    if (decision.action === 'CREATE_NEW') {
                        results.push({
                            rowNumber: row.rowNumber,
                            ...await createProductFromImport({
                                scope,
                                workspaceId,
                                actorId,
                                row,
                                reviewedCandidateIds: row.candidates.map(({ id }) => id),
                            }),
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
            scope,
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
                $set: { status: PRODUCT_IMPORT_STATUS.PREVIEWED },
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
