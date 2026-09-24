import { readFile } from 'node:fs/promises';

import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import { ProductCategory } from './productCategory.model.js';
import {
    attachVariantToWorkspace,
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
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CONSERVATION_TYPE,
    PRODUCT_CONTRIBUTION_CLASSIFICATION,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_FOOD_RANGES,
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_IMPORT_STATUS,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import { ProductImportSession } from './productImportSession.model.js';
import { ProductVariety } from './productVariety.model.js';
import { ProductVariant } from './productVariant.model.js';
import { parseProductImportFile } from './productCatalogImport.parser.js';
import {
    submitReferenceContribution,
} from './productReferenceContribution.service.js';
import {
    createProductCharacteristic,
    createProductVariety,
} from './productReferenceDimension.service.js';

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

const CONSERVATION_ALIASES = Object.freeze({
    frais: PRODUCT_CONSERVATION_TYPE.FRAIS,
    refrigere: PRODUCT_CONSERVATION_TYPE.REFRIGERE,
    refrigeré: PRODUCT_CONSERVATION_TYPE.REFRIGERE,
    surgele: PRODUCT_CONSERVATION_TYPE.SURGELE,
    surgélé: PRODUCT_CONSERVATION_TYPE.SURGELE,
    conserve: PRODUCT_CONSERVATION_TYPE.CONSERVE,
    sec: PRODUCT_CONSERVATION_TYPE.SEC,
});

const parseConservationType = (value) => {
    const normalized = normalizeProductText(value);
    return normalized ? CONSERVATION_ALIASES[normalized] ?? null : null;
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
    const rawConservationType = value('conservationType');
    const rawFoodRange = value('foodRange');
    const rawReferenceUnit = value('referenceUnit');
    const rawYieldPercent = value('yieldPercent');
    const foodRange = rawFoodRange === ''
        ? defaults.foodRange ?? null
        : parseFoodRange(rawFoodRange);
    const conservationType = rawConservationType === ''
        ? defaults.conservationType ?? null
        : parseConservationType(rawConservationType);
    const referenceUnit = rawReferenceUnit === ''
        ? defaults.referenceUnit ?? null
        : parseReferenceUnit(rawReferenceUnit);
    const yieldPercent = rawYieldPercent === ''
        ? defaults.yieldPercent ?? null
        : parseYield(rawYieldPercent);

    const errors = [];

    if (!name) errors.push('Nom Produit obligatoire.');
    if (!conservationType) {
        errors.push('Conservation obligatoire ou invalide.');
    }
    if (Number.isNaN(foodRange)) {
        errors.push('Gamme invalide.');
    }
    if (!referenceUnit) {
        errors.push('Unité de référence obligatoire ou invalide.');
    }
    if (Number.isNaN(yieldPercent)) errors.push('Rendement invalide.');

    const variety = String(value('variety')).trim() || null;
    const characteristicValues = [
        [PRODUCT_CHARACTERISTIC_KIND.PRESENTATION, value('presentation')],
        [PRODUCT_CHARACTERISTIC_KIND.CUT, value('cut')],
        [PRODUCT_CHARACTERISTIC_KIND.COMMERCIAL_TYPE, value('commercialType')],
        [PRODUCT_CHARACTERISTIC_KIND.SIZE_FORMAT, value('sizeFormat')],
        [PRODUCT_CHARACTERISTIC_KIND.COLOR, value('color')],
        [
            PRODUCT_CHARACTERISTIC_KIND.QUALITY_DESIGNATION,
            value('qualityDesignation'),
        ],
    ]
        .map(([kind, rawValue]) => ({
            kind,
            value: String(rawValue).trim(),
        }))
        .filter(({ value: mappedValue }) => Boolean(mappedValue));
    const processingState = String(
        value('processingState'),
    ).trim() || null;

    return {
        rowNumber,
        data: {
            name,
            aliases,
            categoryName: String(value('category')).trim() || null,
            dimensions: {
                variety,
                characteristics: characteristicValues,
            },
            variant: {
                name,
                processingState,
                conservationType,
                foodRange: Number.isNaN(foodRange) ? null : foodRange,
                referenceUnit,
                yieldPercent: Number.isNaN(yieldPercent) ? null : yieldPercent,
            },
        },
        errors,
    };
};

const buildImportDimensionIndexes = async (productIds) => {
    if (productIds.length === 0) {
        return {
            varietyByKey: new Map(),
            characteristicByKey: new Map(),
        };
    }

    const [varieties, characteristics] = await Promise.all([
        ProductVariety.find({
            canonicalProduct: mongoose.trusted({ $in: productIds }),
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
        }).lean(),
        ProductCharacteristic.find({
            canonicalProduct: mongoose.trusted({ $in: productIds }),
            identityActive: true,
            status: mongoose.trusted({
                $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
            }),
        }).lean(),
    ]);

    const varietyByKey = new Map();
    for (const variety of varieties) {
        const keys = new Set([
            variety.normalizedName,
            ...(variety.searchKeys ?? []),
        ]);
        for (const key of keys) {
            varietyByKey.set([
                variety.canonicalProduct.toString(),
                key,
            ].join(':'), variety);
        }
    }

    const characteristicByKey = new Map();
    for (const characteristic of characteristics) {
        const keys = new Set([
            characteristic.normalizedName,
            ...(characteristic.searchKeys ?? []),
        ]);
        for (const key of keys) {
            characteristicByKey.set([
                characteristic.canonicalProduct.toString(),
                characteristic.kind,
                key,
            ].join(':'), characteristic);
        }
    }

    return {
        varietyByKey,
        characteristicByKey,
    };
};

const resolveImportDimensions = ({
    productId,
    dimensions,
    varietyByKey,
    characteristicByKey,
}) => {
    const missing = [];
    const archived = [];
    let variety = null;

    if (dimensions.variety) {
        variety = varietyByKey.get([
            productId.toString(),
            normalizeProductText(dimensions.variety),
        ].join(':')) ?? null;

        if (!variety) {
            missing.push({
                type: PRODUCT_CONTRIBUTION_TYPE.VARIETY,
                value: dimensions.variety,
            });
        } else if (variety.status !== PRODUCT_STATUS.ACTIVE) {
            archived.push({
                type: PRODUCT_CONTRIBUTION_TYPE.VARIETY,
                id: variety._id.toString(),
                value: variety.name,
            });
        }
    }

    const characteristics = [];
    for (const proposal of dimensions.characteristics ?? []) {
        const characteristic = characteristicByKey.get([
            productId.toString(),
            proposal.kind,
            normalizeProductText(proposal.value),
        ].join(':')) ?? null;

        if (!characteristic) {
            missing.push({
                type: PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC,
                kind: proposal.kind,
                value: proposal.value,
            });
            continue;
        }

        if (characteristic.status !== PRODUCT_STATUS.ACTIVE) {
            archived.push({
                type: PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC,
                id: characteristic._id.toString(),
                kind: characteristic.kind,
                value: characteristic.name,
            });
            continue;
        }

        characteristics.push(characteristic);
    }

    return {
        variety,
        characteristics,
        missing,
        archived,
        resolved: {
            varietyId: variety?._id.toString() ?? null,
            characteristicIds: characteristics.map(({ _id }) => _id.toString()),
        },
    };
};

const buildProductImportPreview = async ({
    scope = PRODUCT_IMPORT_SCOPE.WORKSPACE,
    workspaceId = null,
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
    const {
        varietyByKey,
        characteristicByKey,
    } = await buildImportDimensionIndexes(
        exactProducts.map(({ _id }) => _id),
    );
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

        if (
            scope === PRODUCT_IMPORT_SCOPE.WORKSPACE
            && data.aliases.length > 0
        ) {
            warnings.push(
                'Les alias importés ne sont pas publiés depuis un Workspace.',
            );
        }

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

            const dimensionResolution = resolveImportDimensions({
                productId: exactProduct._id,
                dimensions: data.dimensions,
                varietyByKey,
                characteristicByKey,
            });

            if (dimensionResolution.archived.length > 0) {
                preview.push({
                    ...row,
                    data: {
                        ...data,
                        categoryId: category?._id.toString() ?? null,
                    },
                    warnings,
                    errors: [
                        ...errors,
                        'Une Variété ou Caractéristique demandée est archivée.',
                    ],
                    productId: exactProduct._id.toString(),
                    classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.INVALID,
                    candidates: [],
                    resolvedDimensions: dimensionResolution.resolved,
                    missingDimensions: dimensionResolution.missing,
                });
                continue;
            }

            const signature = dimensionResolution.missing.length === 0
                ? buildVariantSignature({
                    name: data.variant.name,
                    varietyId: dimensionResolution.variety?._id ?? null,
                    characteristics: dimensionResolution.characteristics,
                })
                : null;
            const existingVariant = signature
                ? variantBySignature.get(
                    `${exactProduct._id.toString()}:${signature}`,
                )
                : null;

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
                    resolvedDimensions: dimensionResolution.resolved,
                    missingDimensions: [],
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
                resolvedDimensions: dimensionResolution.resolved,
                missingDimensions: dimensionResolution.missing,
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
            preview.push({
                ...preparedRow,
                classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED,
                reviewMode: 'DUPLICATE_CANDIDATE',
            });
            continue;
        }

        preview.push({
            ...preparedRow,
            classification: scope === PRODUCT_IMPORT_SCOPE.WORKSPACE
                ? PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED
                : PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT,
            reviewMode: scope === PRODUCT_IMPORT_SCOPE.WORKSPACE
                ? 'REFERENCE_GOVERNANCE'
                : null,
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
    reviewMode: row.reviewMode ?? null,
    resolvedDimensions: row.resolvedDimensions ?? null,
    missingDimensions: row.missingDimensions ?? [],
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

const resolveMissingImportDimensions = async ({
    scope,
    workspaceId,
    actorId,
    productId,
    row,
}) => {
    let varietyId = row.resolvedDimensions?.varietyId ?? null;
    const characteristicIds = [
        ...(row.resolvedDimensions?.characteristicIds ?? []),
    ];
    const pendingContributionIds = [];

    for (const proposal of row.missingDimensions ?? []) {
        if (scope === PRODUCT_IMPORT_SCOPE.GLOBAL) {
            if (proposal.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
                const created = await createProductVariety({
                    actorId,
                    productId,
                    name: proposal.value,
                    aliases: [],
                });
                varietyId = created.id;
            } else {
                const created = await createProductCharacteristic({
                    actorId,
                    productId,
                    kind: proposal.kind,
                    name: proposal.value,
                    aliases: [],
                });
                characteristicIds.push(created.id);
            }
            continue;
        }

        const result = await submitReferenceContribution({
            workspaceId,
            actorId,
            type: proposal.type,
            productId,
            characteristicKind: proposal.kind ?? null,
            value: proposal.value,
        });

        if (
            result.classification
            === PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING
        ) {
            if (result.existingReference?.status !== PRODUCT_STATUS.ACTIVE) {
                throw new AppError(
                    'Une dimension existante de la déclinaison est archivée.',
                    409,
                );
            }
            if (proposal.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
                varietyId = result.existingReference.id;
            } else {
                characteristicIds.push(result.existingReference.id);
            }
            continue;
        }

        if (
            result.classification
            === PRODUCT_CONTRIBUTION_CLASSIFICATION.AUTO_PUBLISHABLE
        ) {
            if (proposal.type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
                varietyId = result.publishedReference.id;
            } else {
                characteristicIds.push(result.publishedReference.id);
            }
            continue;
        }

        if (
            result.classification
            === PRODUCT_CONTRIBUTION_CLASSIFICATION.REVIEW_REQUIRED
        ) {
            if (result.contribution?.id) {
                pendingContributionIds.push(result.contribution.id);
            }
            continue;
        }

        throw new AppError(
            'Une dimension importée ne peut pas être publiée.',
            409,
        );
    }

    return {
        varietyId,
        characteristicIds: [...new Set(characteristicIds)],
        pendingContributionIds,
    };
};

const createVariantFromImport = async ({
    scope,
    workspaceId,
    actorId,
    productId,
    row,
}) => {
    const dimensions = await resolveMissingImportDimensions({
        scope,
        workspaceId,
        actorId,
        productId,
        row,
    });

    if (dimensions.pendingContributionIds.length > 0) {
        return {
            status: 'PENDING_REVIEW',
            productId,
            contributionIds: dimensions.pendingContributionIds,
        };
    }

    const variant = {
        ...row.data.variant,
        varietyId: dimensions.varietyId,
        characteristicIds: dimensions.characteristicIds,
    };

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

const splitNewProductDimensions = (row) => {
    const presentation = (row.data.dimensions?.characteristics ?? [])
        .find(({ kind }) => (
            kind === PRODUCT_CHARACTERISTIC_KIND.PRESENTATION
        ))?.value ?? null;

    return {
        baseVariant: {
            ...row.data.variant,
            ...(presentation ? { presentation } : {}),
        },
        dimensionProposals: {
            variety: row.data.dimensions?.variety ?? null,
            characteristics: (row.data.dimensions?.characteristics ?? [])
                .filter(({ kind }) => (
                    kind !== PRODUCT_CHARACTERISTIC_KIND.PRESENTATION
                )),
        },
    };
};

const createProductFromImport = async ({
    scope,
    workspaceId,
    actorId,
    row,
    reviewedCandidateIds,
}) => {
    const {
        baseVariant,
        dimensionProposals,
    } = splitNewProductDimensions(row);

    if (scope === PRODUCT_IMPORT_SCOPE.GLOBAL) {
        const created = await createGlobalProduct({
            actorId,
            name: row.data.name,
            aliases: row.data.aliases,
            categoryId: row.data.categoryId,
            reviewedCandidateIds,
            variant: baseVariant,
            dimensionProposals,
        });

        return {
            status: 'CREATED_PRODUCT',
            productId: created.product.id,
            variantId: created.variant.id,
        };
    }

    const result = await submitReferenceContribution({
        workspaceId,
        actorId,
        type: PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT,
        value: row.data.name,
        categoryId: row.data.categoryId,
        variant: baseVariant,
        dimensionProposals,
    });

    if (
        result.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.REVIEW_REQUIRED
    ) {
        return {
            status: 'PENDING_REVIEW',
            contributionId: result.contribution?.id ?? null,
        };
    }

    if (
        result.classification
        === PRODUCT_CONTRIBUTION_CLASSIFICATION.EXISTING
    ) {
        return {
            status: 'EXISTING_REFERENCE',
            productId: result.existingReference?.id ?? null,
        };
    }

    throw new AppError(
        'La création importée du Produit n’a pas produit une décision exploitable.',
        409,
    );
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
                            row,
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
                    if (row.reviewMode === 'REFERENCE_GOVERNANCE') {
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
