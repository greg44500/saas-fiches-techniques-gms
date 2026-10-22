import mongoose from 'mongoose';

import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductCategory,
} from '../productCatalog/productCategory.model.js';
import {
    listProductCategories,
} from '../productCatalog/productCategoryProjection.service.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    buildWorkspaceGovernanceVisibilityFilter,
} from '../productCatalog/productReferenceGovernance.service.js';
import { AppError } from '../../utils/appError.js';
import { SupplierTariff } from './supplierCatalog.model.js';
import { supplierTariffPresentation } from './supplierArticlePresentation.service.js';
import {
    packagingSignature, packagingSignaturesMatch,
} from './supplierRecipeUnitEquivalence.service.js';
import { selectSupplierTariffs } from './supplierTariffSelection.service.js';
import {
    Supplier,
    SupplierArticle,
} from './supplier.model.js';
import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    normalizeSupplierReference,
    normalizeSupplierText,
} from './supplierCatalog.normalization.js';
import {
    createSupplierCatalogEvent,
} from './supplierCatalogEvent.service.js';
import {
    serializeSupplier,
    serializeSupplierArticle,
} from './supplierCatalog.serializer.js';

const escapeRegex = (value) =>
    value.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');

const formatSupplierName = (name) => name.trim().replace(/\s+/g, ' ').toLocaleUpperCase('fr');

const ensureSupplierNameAvailable = async ({
    scope, workspaceId, name, excludeId = null, session,
}) => {
    const normalizedName = normalizeSupplierText(name);
    const existing = await Supplier.findOne({
        normalizedName,
        ...(scope === SUPPLIER_SCOPE.GLOBAL_SHARED
            ? { scope, workspace: null }
            : {
                $or: mongoose.trusted([
                    { scope: SUPPLIER_SCOPE.GLOBAL_SHARED, workspace: null },
                    { scope, workspace: workspaceId },
                ]),
            }),
        ...(excludeId ? { _id: mongoose.trusted({ $ne: excludeId }) } : {}),
    }).session(session);
    if (existing) {
        throw new AppError(
            'Un Fournisseur portant ce nom existe déjà dans le référentiel accessible : '
                + existing.name + '. Sélectionnez la fiche existante.',
            409,
        );
    }
    // Les variantes avec un 's' final nécessitent une décision humaine.
    const candidateNames = [
        normalizedName,
        normalizedName.endsWith('s') ? normalizedName.slice(0, -1) : normalizedName + 's',
    ];
    const near = await Supplier.findOne({
        normalizedName: mongoose.trusted({ $in: candidateNames }),
        ...(scope === SUPPLIER_SCOPE.GLOBAL_SHARED
            ? { scope, workspace: null }
            : {
                $or: mongoose.trusted([
                    { scope: SUPPLIER_SCOPE.GLOBAL_SHARED, workspace: null },
                    { scope, workspace: workspaceId },
                ]),
            }),
        ...(excludeId ? { _id: mongoose.trusted({ $ne: excludeId }) } : {}),
    }).session(session);
    if (near && near.normalizedName !== normalizedName) {
        throw new AppError(
            'Nom de Fournisseur proche d’une fiche existante : ' + near.name
            + '. Vérifiez le référentiel avant de créer une autre identité.',
            409,
        );
    }
    return normalizedName;
};

const normalizeDecimalInput = (value) => (
    value === null || value === undefined
        ? null
        : String(value)
);

const multiplyDecimalByInteger = (value, multiplier) => {
    if (value === null || value === undefined || multiplier === null) {
        return null;
    }

    const text = String(value);
    const negative = text.startsWith('-');
    const unsigned = negative ? text.slice(1) : text;
    const [whole, fraction = ''] = unsigned.split('.');
    const digits = BigInt((whole || '0') + fraction);
    const multiplied = digits * BigInt(multiplier);
    const raw = multiplied.toString().padStart(fraction.length + 1, '0');

    if (fraction.length === 0) {
        return (negative ? '-' : '') + raw;
    }

    const integerPart = raw.slice(0, -fraction.length) || '0';
    const fractionPart = raw.slice(-fraction.length)
        .replace(/0+$/, '');

    return (negative ? '-' : '')
        + integerPart
        + (fractionPart ? '.' + fractionPart : '');
};

const normalizePackaging = (packaging) => {
    if (!packaging) return null;

    const normalized = {
        containerType: packaging.containerType ?? null,
        unitCount: packaging.unitCount ?? null,
        quantityPerUnit:
            normalizeDecimalInput(packaging.quantityPerUnit),
        unit: packaging.unit ?? null,
        totalQuantity: null,
        netWeight: normalizeDecimalInput(packaging.netWeight),
        netWeightUnit: packaging.netWeightUnit ?? null,
        drainedNetWeight:
            normalizeDecimalInput(packaging.drainedNetWeight),
        drainedNetWeightUnit:
            packaging.drainedNetWeightUnit ?? null,
        supplierLabel: packaging.supplierLabel ?? null,
    };

    if (
        normalized.unitCount !== null
        && normalized.quantityPerUnit !== null
        && normalized.unit
    ) {
        normalized.totalQuantity = multiplyDecimalByInteger(
            normalized.quantityPerUnit,
            normalized.unitCount,
        );
    }

    return normalized;
};

// La preuve ne doit changer que si le contenu physique ou l'identité change.
const PACKAGING_KEYS = [
    'containerType', 'unitCount', 'quantityPerUnit', 'unit', 'totalQuantity',
    'netWeight', 'netWeightUnit', 'drainedNetWeight', 'drainedNetWeightUnit',
    'supplierLabel',
];
const samePackaging = (left, right) => {
    const a = normalizePackaging(left);
    const b = normalizePackaging(right);
    return PACKAGING_KEYS.every((key) => {
        const value = (packaging, name) => packaging?.[name] == null
            ? null : String(packaging[name]);
        return value(a, key) === value(b, key);
    });
};

const buildWorkspaceVisibilityFilter = (workspaceId) => mongoose.trusted({
    $or: [
        {
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            workspace: null,
        },
        {
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspace: workspaceId,
        },
    ],
});

const resolveActiveSupplierCategories = async ({
    categoryIds = [],
    session,
}) => {
    const uniqueCategoryIds = [...new Set(
        (categoryIds ?? []).map((categoryId) => categoryId.toString()),
    )];

    if (uniqueCategoryIds.length === 0) return [];

    const categories = await ProductCategory.find({
        _id: mongoose.trusted({ $in: uniqueCategoryIds }),
        status: PRODUCT_CATEGORY_STATUS.ACTIVE,
    })
        .select('_id name status')
        .session(session);

    if (categories.length !== uniqueCategoryIds.length) {
        throw new AppError(
            'Une ou plusieurs catégories Produit sont indisponibles.',
            409,
        );
    }

    const categoryById = new Map(
        categories.map((category) => [
            category._id.toString(),
            category,
        ]),
    );

    return uniqueCategoryIds.map(
        (categoryId) => categoryById.get(categoryId)._id,
    );
};

const populateSupplierCategories = async (supplier) => {
    await supplier.populate({
        path: 'productCategories',
        select: '_id name status',
    });

    return supplier;
};

const assertActiveProductVariant = async ({
    productVariantId,
    workspaceId = null,
    session,
}) => {
    const productVariant = await ProductVariant.findOne({
        _id: productVariantId,
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
        ...buildWorkspaceGovernanceVisibilityFilter(workspaceId),
    }).session(session);

    if (!productVariant) {
        throw new AppError(
            'Référence Produit indisponible.',
            409,
        );
    }

    return productVariant;
};

const findVisibleSupplier = async ({
    workspaceId,
    supplierId,
    session = null,
    requireActive = false,
}) => {
    const supplier = await Supplier.findOne({
        _id: supplierId,
        ...buildWorkspaceVisibilityFilter(workspaceId),
        ...(requireActive
            ? { status: SUPPLIER_RESOURCE_STATUS.ACTIVE }
            : {}),
    }).session(session);

    if (!supplier) {
        throw new AppError('Fournisseur introuvable.', 404);
    }

    return supplier;
};

const findScopedSupplier = async ({
    scope,
    workspaceId = null,
    supplierId,
    session,
}) => {
    const supplier = await Supplier.findOne({
        _id: supplierId,
        scope,
        workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED
            ? null
            : workspaceId,
    }).session(session);

    if (!supplier) {
        throw new AppError('Fournisseur introuvable.', 404);
    }

    return supplier;
};

const createSupplier = async ({
    scope,
    workspaceId = null,
    actorId,
    data,
}) => mongoose.connection.transaction(async (session) => {
    const productCategories = await resolveActiveSupplierCategories({
        categoryIds: data.categoryIds ?? [],
        session,
    });

    const normalizedName = await ensureSupplierNameAvailable({
        scope, workspaceId, name: data.name, session,
    });

    const [supplier] = await Supplier.create([
        {
            scope,
            workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED
                ? null
                : workspaceId,
            name: formatSupplierName(data.name),
            normalizedName,
            supplierCode: data.supplierCode ?? null,
            legalName: data.legalName ?? null,
            website: data.website ?? null,
            productCategories,
            createdBy: actorId,
            updatedBy: actorId,
        },
    ], { session });

    await createSupplierCatalogEvent({
        scope,
        workspaceId: supplier.workspace,
        actorId,
        action: SUPPLIER_CATALOG_EVENT_ACTION.SUPPLIER_CREATED,
        entityType: SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER,
        entityId: supplier._id,
        session,
    });

    await populateSupplierCategories(supplier);

    return serializeSupplier(supplier);
});

const updateSupplier = async ({
    scope,
    workspaceId = null,
    supplierId,
    actorId,
    data,
}) => mongoose.connection.transaction(async (session) => {
    const supplier = await findScopedSupplier({
        scope,
        workspaceId,
        supplierId,
        session,
    });
    if (Object.hasOwn(data, 'name')) {
        await ensureSupplierNameAvailable({
            scope, workspaceId, name: data.name, excludeId: supplier._id, session,
        });
        data = { ...data, name: formatSupplierName(data.name) };
    }
    const changedFields = [];

    for (const field of [
        'name',
        'supplierCode',
        'legalName',
        'website',
    ]) {
        if (!Object.hasOwn(data, field)) continue;

        if (supplier[field] !== data[field]) {
            supplier[field] = data[field];
            changedFields.push(field);
        }
    }

    if (Object.hasOwn(data, 'name')) {
        const normalizedName = normalizeSupplierText(data.name);
        if (supplier.normalizedName !== normalizedName) {
            supplier.normalizedName = normalizedName;
        }
    }

    if (Object.hasOwn(data, 'categoryIds')) {
        const productCategories = await resolveActiveSupplierCategories({
            categoryIds: data.categoryIds,
            session,
        });
        const previousCategoryIds = (supplier.productCategories ?? [])
            .map((categoryId) => categoryId.toString());
        const nextCategoryIds = productCategories
            .map((categoryId) => categoryId.toString());

        if (
            previousCategoryIds.length !== nextCategoryIds.length
            || previousCategoryIds.some(
                (categoryId, index) => categoryId !== nextCategoryIds[index],
            )
        ) {
            supplier.productCategories = productCategories;
            changedFields.push('productCategories');
        }
    }

    if (changedFields.length === 0) {
        await populateSupplierCategories(supplier);
        return serializeSupplier(supplier);
    }

    supplier.updatedBy = actorId;
    await supplier.save({ session });

    await createSupplierCatalogEvent({
        scope,
        workspaceId: supplier.workspace,
        actorId,
        action: SUPPLIER_CATALOG_EVENT_ACTION.SUPPLIER_UPDATED,
        entityType: SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER,
        entityId: supplier._id,
        metadata: { changedFields },
        session,
    });

    await populateSupplierCategories(supplier);

    return serializeSupplier(supplier);
});

const updateSupplierStatus = async ({
    scope,
    workspaceId = null,
    supplierId,
    actorId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const supplier = await findScopedSupplier({
        scope,
        workspaceId,
        supplierId,
        session,
    });

    if (supplier.status === status) {
        await populateSupplierCategories(supplier);
        return serializeSupplier(supplier);
    }

    supplier.status = status;
    supplier.updatedBy = actorId;
    await supplier.save({ session });

    await createSupplierCatalogEvent({
        scope,
        workspaceId: supplier.workspace,
        actorId,
        action: status === SUPPLIER_RESOURCE_STATUS.ARCHIVED
            ? SUPPLIER_CATALOG_EVENT_ACTION.SUPPLIER_ARCHIVED
            : SUPPLIER_CATALOG_EVENT_ACTION.SUPPLIER_REACTIVATED,
        entityType: SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER,
        entityId: supplier._id,
        session,
    });

    await populateSupplierCategories(supplier);

    return serializeSupplier(supplier);
});

const listSuppliers = async ({
    workspaceId = null,
    globalOnly = false,
    page = 1,
    limit = 20,
    search = null,
    status = SUPPLIER_RESOURCE_STATUS.ACTIVE,
    scope = null,
}) => {
    const filter = globalOnly
        ? {
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            workspace: null,
        }
        : {
            ...buildWorkspaceVisibilityFilter(workspaceId),
        };

    if (status) filter.status = status;
    if (scope) filter.scope = scope;

    if (search) {
        filter.normalizedName = new RegExp(
            escapeRegex(normalizeSupplierText(search)),
            'i',
        );
    }

    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
        Supplier.find(filter)
            .sort({ name: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'productCategories',
                select: '_id name status',
            })
            .lean(),
        Supplier.countDocuments(filter),
    ]);

    return {
        suppliers: suppliers.map(serializeSupplier),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const assertSupplierAllowedForArticle = ({
    supplier,
    articleScope,
    workspaceId,
}) => {
    if (
        articleScope === SUPPLIER_SCOPE.GLOBAL_SHARED
        && supplier.scope !== SUPPLIER_SCOPE.GLOBAL_SHARED
    ) {
        throw new AppError(
            'Un Article global exige un Fournisseur global.',
            409,
        );
    }

    if (
        supplier.scope === SUPPLIER_SCOPE.WORKSPACE_PRIVATE
        && supplier.workspace.toString() !== workspaceId?.toString()
    ) {
        throw new AppError('Fournisseur introuvable.', 404);
    }
};

const findScopedArticle = async ({
    scope,
    workspaceId = null,
    articleId,
    session,
}) => {
    const article = await SupplierArticle.findOne({
        _id: articleId,
        scope,
        workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED
            ? null
            : workspaceId,
    }).session(session);

    if (!article) {
        throw new AppError('Article fournisseur introuvable.', 404);
    }

    return article;
};

const createArticleInSession = async ({
    scope,
    workspaceId,
    actorId,
    data,
    session,
}) => {
    const supplier = scope === SUPPLIER_SCOPE.GLOBAL_SHARED
        ? await findScopedSupplier({
            scope,
            supplierId: data.supplierId,
            session,
        })
        : await findVisibleSupplier({
            workspaceId,
            supplierId: data.supplierId,
            session,
            requireActive: true,
        });

    if (supplier.status !== SUPPLIER_RESOURCE_STATUS.ACTIVE) {
        throw new AppError(
            'Le Fournisseur est archivé.',
            409,
        );
    }

    assertSupplierAllowedForArticle({
        supplier,
        articleScope: scope,
        workspaceId,
    });

    if (!data.productVariantId && scope === SUPPLIER_SCOPE.GLOBAL_SHARED) {
        throw new AppError('Une Référence Produit est obligatoire pour un Article global.', 409);
    }
    const variant = data.productVariantId
        ? await assertActiveProductVariant({
            productVariantId: data.productVariantId,
            workspaceId,
            session,
        }) : null;
    const packaging = normalizePackaging(data.packaging);
    let recipeUnitEquivalence = null;
    if (data.recipeUnitsPerPackage != null) {
        const signature = packagingSignature(packaging);
        if (!variant || variant.referenceUnit !== 'UNIT' || !signature
            || data.confirmRecipeUnits !== true) {
            throw new AppError(
                'La confirmation des pièces exige une Référence en pièces et un colisage physique complet.',
                409,
            );
        }
        recipeUnitEquivalence = {
            unitsPerPackage: data.recipeUnitsPerPackage,
            packagingSignature: signature,
            productVariant: variant._id,
            verifiedBy: actorId,
            verifiedAt: new Date(),
        };
    }

    const normalizedSupplierReference =
        normalizeSupplierReference(data.supplierReference);

    if (!normalizedSupplierReference) {
        throw new AppError(
            'La référence fournisseur est obligatoire.',
            400,
        );
    }

    try {
        const [article] = await SupplierArticle.create([
            {
                scope,
                workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED
                    ? null
                    : workspaceId,
                supplier: supplier._id,
                productVariant: data.productVariantId,
                supplierReference: data.supplierReference,
                normalizedSupplierReference,
                supplierDesignation:
                    data.supplierDesignation ?? null,
                brand: data.brand ?? null,
                packaging,
                recipeUnitEquivalence,
                provenance: data.provenance ?? null,
                createdBy: actorId,
                updatedBy: actorId,
            },
        ], { session });

        await createSupplierCatalogEvent({
            scope,
            workspaceId: article.workspace,
            actorId,
            action: SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_CREATED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER_ARTICLE,
            entityId: article._id,
            metadata: {
                supplierId: supplier._id.toString(),
                productVariantId:
                    data.productVariantId?.toString() ?? null,
                recipeUnitsVerified: Boolean(recipeUnitEquivalence),
            },
            session,
        });

        await article.populate([
            {
                path: 'supplier',
                select: '_id name scope status',
            },
            {
                path: 'productVariant',
                select: '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural status',
            },
        ]);

        return article;
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'Cette référence fournisseur existe déjà.',
                409,
            );
        }

        throw error;
    }
};

const createSupplierArticle = async (params) =>
    mongoose.connection.transaction(async (session) => {
        const article = await createArticleInSession({
            ...params,
            session,
        });

        return serializeSupplierArticle(article);
    });

const updateSupplierArticle = async ({
    scope,
    workspaceId = null,
    articleId,
    actorId,
    data,
}) => mongoose.connection.transaction(async (session) => {
    const article = await findScopedArticle({
        scope,
        workspaceId,
        articleId,
        session,
    });
    const changedFields = [];

    if (Object.hasOwn(data, 'productVariantId')) {
        if (data.productVariantId !== null) {
            await assertActiveProductVariant({
                productVariantId: data.productVariantId,
                workspaceId,
                session,
            });
        }
        if (
            (article.productVariant?.toString() ?? null)
            !== data.productVariantId
        ) {
            article.productVariant = data.productVariantId;
            changedFields.push('productVariant');
        }
    }

    for (const field of [
        'supplierDesignation',
        'brand',
        'provenance',
    ]) {
        if (!Object.hasOwn(data, field)) continue;
        if (article[field] !== data[field]) {
            article[field] = data[field];
            changedFields.push(field);
        }
    }

    const previousSignature = packagingSignature(article.packaging);
    if (Object.hasOwn(data, 'packaging')) {
        const nextPackaging = normalizePackaging(data.packaging);
        if (!samePackaging(article.packaging, nextPackaging)) {
            article.packaging = nextPackaging;
            changedFields.push('packaging');
        }
    }
    const currentSignature = packagingSignature(article.packaging);
    const identityChanged = changedFields.includes('productVariant');
    const physicalContentChanged = !packagingSignaturesMatch(
        previousSignature, currentSignature,
    );
    const oldProof = article.recipeUnitEquivalence;
    const proofValid = Boolean(oldProof
        && packagingSignaturesMatch(oldProof.packagingSignature, currentSignature)
        && oldProof.productVariant?.toString() === article.productVariant?.toString());

    if (Object.hasOwn(data, 'recipeUnitsPerPackage')) {
        if (data.recipeUnitsPerPackage === null) {
            if (oldProof) {
                article.recipeUnitEquivalence = null;
                changedFields.push('recipeUnitEquivalence');
            }
        } else {
            if (!article.productVariant) {
                throw new AppError('Associez d’abord une Référence Produit.', 409);
            }
            const variant = await assertActiveProductVariant({
                productVariantId: article.productVariant,
                workspaceId,
                session,
            });
            if (variant.referenceUnit !== 'UNIT' || !currentSignature) {
                throw new AppError(
                    'Le colis doit contenir plusieurs éléments de quantité physique connue.',
                    409,
                );
            }
            if (data.confirmRecipeUnits !== true) {
                throw new AppError('Confirmez explicitement le nombre de pièces.', 409);
            }
            // Une confirmation identique ne recrée ni preuve, ni horodatage.
            if (!proofValid || oldProof.unitsPerPackage !== data.recipeUnitsPerPackage) {
                article.recipeUnitEquivalence = {
                    unitsPerPackage: data.recipeUnitsPerPackage,
                    packagingSignature: currentSignature,
                    productVariant: variant._id,
                    verifiedBy: actorId,
                    verifiedAt: new Date(),
                };
                changedFields.push('recipeUnitEquivalence');
            }
        }
    } else if (oldProof && (identityChanged || physicalContentChanged || !proofValid)) {
        article.recipeUnitEquivalence = null;
        changedFields.push('recipeUnitEquivalence');
    }

    if (changedFields.length === 0) {
        await article.populate([
            { path: 'supplier', select: '_id name scope status' },
            {
                path: 'productVariant',
                select: '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural status',
            },
        ]);
        return serializeSupplierArticle(article);
    }

    article.updatedBy = actorId;
    await article.save({ session });

    await createSupplierCatalogEvent({
        scope,
        workspaceId: article.workspace,
        actorId,
        action: SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_UPDATED,
        entityType:
            SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER_ARTICLE,
        entityId: article._id,
        metadata: { changedFields },
        session,
    });

    await article.populate([
        { path: 'supplier', select: '_id name scope status' },
        {
            path: 'productVariant',
            select: '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural status',
        },
    ]);

    return serializeSupplierArticle(article);
});

const updateSupplierArticleStatus = async ({
    scope,
    workspaceId = null,
    articleId,
    actorId,
    status,
}) => mongoose.connection.transaction(async (session) => {
    const article = await findScopedArticle({
        scope,
        workspaceId,
        articleId,
        session,
    });

    if (article.status !== status) {
        article.status = status;
        article.updatedBy = actorId;
        await article.save({ session });

        await createSupplierCatalogEvent({
            scope,
            workspaceId: article.workspace,
            actorId,
            action: status === SUPPLIER_RESOURCE_STATUS.ARCHIVED
                ? SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_ARCHIVED
                : SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_REACTIVATED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER_ARTICLE,
            entityId: article._id,
            session,
        });
    }

    await article.populate([
        { path: 'supplier', select: '_id name scope status' },
        {
            path: 'productVariant',
            select: '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural status',
        },
    ]);

    return serializeSupplierArticle(article);
});

const replaceSupplierArticle = async ({
    scope,
    workspaceId = null,
    articleId,
    actorId,
    data,
}) => mongoose.connection.transaction(async (session) => {
    const previous = await findScopedArticle({
        scope,
        workspaceId,
        articleId,
        session,
    });

    if (previous.status !== SUPPLIER_RESOURCE_STATUS.ACTIVE) {
        throw new AppError(
            'Seul un Article actif peut être remplacé.',
            409,
        );
    }

    const replacement = await createArticleInSession({
        scope,
        workspaceId,
        actorId,
        data: {
            ...data,
            supplierId: previous.supplier,
            productVariantId:
                data.productVariantId ?? previous.productVariant,
            supplierDesignation:
                data.supplierDesignation
                ?? previous.supplierDesignation,
            brand: data.brand ?? previous.brand,
            packaging: Object.hasOwn(data, 'packaging')
                ? data.packaging
                : previous.packaging?.toObject?.()
                    ?? previous.packaging,
            provenance: data.provenance ?? previous.provenance,
        },
        session,
    });

    previous.status = SUPPLIER_RESOURCE_STATUS.ARCHIVED;
    previous.replacedBy = replacement._id;
    previous.updatedBy = actorId;
    await previous.save({ session });

    await createSupplierCatalogEvent({
        scope,
        workspaceId: previous.workspace,
        actorId,
        action: SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_REPLACED,
        entityType:
            SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER_ARTICLE,
        entityId: previous._id,
        metadata: {
            replacementArticleId:
                replacement._id.toString(),
        },
        session,
    });

    return {
        previousArticleId: previous._id.toString(),
        replacement: serializeSupplierArticle(replacement),
    };
});

const listSupplierArticles = async ({
    includeSupplierTariff = false,
    workspaceId = null,
    globalOnly = false,
    page = 1,
    limit = 20,
    search = null,
    status = SUPPLIER_RESOURCE_STATUS.ACTIVE,
    scope = null,
    supplierId = null,
    productId = null,
    productVariantId = null,
    usableForTechnicalSheet = false,
}) => {
    const filter = globalOnly
        ? {
            scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
            workspace: null,
        }
        : {
            ...buildWorkspaceVisibilityFilter(workspaceId),
        };

    if (status) filter.status = status;
    if (scope) filter.scope = scope;
    if (supplierId) filter.supplier = supplierId;

    if (productVariantId) {
        filter.productVariant = productVariantId;
    } else if (productId) {
        const productVariantIds = await ProductVariant.find({
            canonicalProduct: productId,
            identityActive: true,
        }).distinct('_id');

        filter.productVariant = mongoose.trusted({
            $in: productVariantIds,
        });
    }

    // Le filtre de visibilité du Workspace reste indépendant de la recherche :
    // ne jamais écraser son $or (risque de fuite inter-Workspaces).
    // Ce mode restreint la recherche aux Articles directement utilisables
    // dans la composition d'une Fiche technique.
    let visibleSupplierIds = null;
    let usableVariantIds = null;
    if (usableForTechnicalSheet) {
        // Ce contrat n'expose jamais un Article archivé, même si un client
        // demande explicitement status=ARCHIVED.
        filter.status = SUPPLIER_RESOURCE_STATUS.ACTIVE;
        [visibleSupplierIds, usableVariantIds] = await Promise.all([
            Supplier.find({
                ...buildWorkspaceVisibilityFilter(workspaceId),
                status: SUPPLIER_RESOURCE_STATUS.ACTIVE,
            }).distinct('_id'),
            ProductVariant.find({
                status: PRODUCT_STATUS.ACTIVE,
                identityActive: true,
                ...buildWorkspaceGovernanceVisibilityFilter(workspaceId),
            }).distinct('_id'),
        ]);
        filter.supplier = mongoose.trusted({ $in: visibleSupplierIds });
        filter.productVariant = mongoose.trusted({ $in: usableVariantIds });
    }

    if (search) {
        const normalized = normalizeSupplierText(search);
        const normalizedRef = normalizeSupplierReference(search);
        const conditions = [
            {
                supplierDesignation: new RegExp(
                    escapeRegex(search),
                    'i',
                ),
            },
            {
                normalizedSupplierReference: new RegExp(
                    escapeRegex(normalizedRef),
                    'i',
                ),
            },
            {
                brand: new RegExp(
                    escapeRegex(normalized),
                    'i',
                ),
            },
        ];

        if (usableForTechnicalSheet) {
            const [matchingSuppliers, matchingVariants] = await Promise.all([
                Supplier.find({
                    _id: mongoose.trusted({ $in: visibleSupplierIds }),
                    name: new RegExp(escapeRegex(search), 'i'),
                }).distinct('_id'),
                ProductVariant.find({
                    _id: mongoose.trusted({ $in: usableVariantIds }),
                    name: new RegExp(escapeRegex(search), 'i'),
                }).distinct('_id'),
            ]);
            conditions.push(
                { supplier: mongoose.trusted({ $in: matchingSuppliers }) },
                { productVariant: mongoose.trusted({ $in: matchingVariants }) },
            );
        }

        filter.$and = mongoose.trusted([{ $or: mongoose.trusted(conditions) }]);
    }

    const skip = (page - 1) * limit;
    const query = SupplierArticle.find(filter)
        .populate({
            path: 'supplier',
            select: '_id name scope status',
        })
        .populate({
            path: 'productVariant',
            select: '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural status',
        })
        .sort({ supplierReference: 1, _id: 1 })
        .skip(skip)
        .limit(limit);

    const [articles, total] = await Promise.all([
        query,
        SupplierArticle.countDocuments(filter),
    ]);

    // Une projection serveur unique évite une requête tarifaire par Article.
    const articleIds = articles.map((article) => article._id);
    const now = new Date();
    const tariffs = includeSupplierTariff && articleIds.length ? await SupplierTariff.find({
        supplierArticle: mongoose.trusted({ $in: articleIds }),
        isCurrent: true,
        ...buildWorkspaceVisibilityFilter(globalOnly ? null : workspaceId),
    }).populate({
        path: 'catalogEdition',
        select: '_id name status',
    }).lean() : [];
    const byArticle = new Map();
    for (const tariff of tariffs) {
        if ((tariff.sourceKind || 'CATALOG') === 'CATALOG'
            && tariff.catalogEdition?.status !== SUPPLIER_RESOURCE_STATUS.ACTIVE) continue;
        const id = tariff.supplierArticle.toString();
        const group = byArticle.get(id) ?? [];
        group.push(tariff);
        byArticle.set(id, group);
    }

    return {
        articles: articles.map((article) => {
            const serialized = serializeSupplierArticle(article);
            const candidates = byArticle.get(article._id.toString()) ?? [];
            const selection = selectSupplierTariffs(candidates, now);
            return {
                ...serialized,
                supplierTariffStatus: !includeSupplierTariff ? 'RESTRICTED'
                    : selection.status,
                supplierTariff: includeSupplierTariff && selection.tariff
                    ? supplierTariffPresentation(selection.tariff, article) : null,
            };
        }),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getSupplierReferenceMetadata = async () => ({
    scopes: Object.values(SUPPLIER_SCOPE),
    statuses: Object.values(SUPPLIER_RESOURCE_STATUS),
    categories: await listProductCategories({
        includeArchived: false,
    }),
});

export {
    createArticleInSession,
    createSupplier,
    createSupplierArticle,
    findVisibleSupplier,
    getSupplierReferenceMetadata,
    listSupplierArticles,
    listSuppliers,
    normalizePackaging,
    replaceSupplierArticle,
    updateSupplier,
    updateSupplierArticle,
    updateSupplierArticleStatus,
    updateSupplierStatus,
};
