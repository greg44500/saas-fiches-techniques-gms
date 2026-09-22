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

const inspectProductImport = async ({
    workspaceId,
    actorId,
    file,
}) => {
    const parsed = parseProductImportFile(file);
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
        expiresAt,
    });

    return {
        importId: session._id.toString(),
        format: session.format,
        headers: [...session.headers],
        rowCount: session.rows.length,
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

    const exactProducts = await CanonicalProduct.find({
        identityActive: true,
        searchKeys: mongoose.trusted({ $in: requestedKeys }),
    }).lean();

    const exactProductByKey = new Map();
    for (const product of exactProducts) {
        for (const key of product.searchKeys ?? []) {
            exactProductByKey.set(key, product);
        }
    }

    const variants = await ProductVariant.find({
        canonicalProduct: mongoose.trusted({ $in: exactProducts.map(({ _id }) => _id) }),
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

            const signature = buildVariantSignature(data.variant);
            const existingVariant = variantBySignature.get(
                `${exactProduct._id.toString()}:${signature}`,
            );

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

    importSession.mapping = { mapping, defaults };
    importSession.preview = preview;
    importSession.status = PRODUCT_IMPORT_STATUS.PREVIEWED;
    await importSession.save();

    const counts = Object.fromEntries(
        Object.values(PRODUCT_IMPORT_ROW_CLASSIFICATION)
            .map((classification) => [
                classification,
                preview.filter((row) => row.classification === classification)
                    .length,
            ]),
    );

    return {
        importId: importSession._id.toString(),
        headers: importSession.headers,
        rowCount: preview.length,
        counts,
        rows: preview,
        expiresAt: importSession.expiresAt,
    };
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

    const decisionByRow = new Map(
        decisions.map((decision) => [decision.rowNumber, decision]),
    );
    const results = [];

    for (const row of importSession.preview) {
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
                    variantId: row.variantId,
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

    try {
        importSession.status = PRODUCT_IMPORT_STATUS.COMMITTED;
        importSession.committedAt = new Date();
        importSession.committedResult = committedResult;
        await importSession.save();
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

    return committedResult;
};

export {
    commitProductImport,
    inspectProductImport,
    previewProductImport,
};
