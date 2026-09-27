import mongoose from 'mongoose';

import {
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import { AppError } from '../../utils/appError.js';
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

const assertActiveProductVariant = async ({
    productVariantId,
    session,
}) => {
    const productVariant = await ProductVariant.findOne({
        _id: productVariantId,
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
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
    const [supplier] = await Supplier.create([
        {
            scope,
            workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED
                ? null
                : workspaceId,
            name: data.name,
            normalizedName: normalizeSupplierText(data.name),
            supplierCode: data.supplierCode ?? null,
            legalName: data.legalName ?? null,
            website: data.website ?? null,
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

    if (changedFields.length === 0) {
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

    await assertActiveProductVariant({
        productVariantId: data.productVariantId,
        session,
    });

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
                packaging: normalizePackaging(data.packaging),
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
                    data.productVariantId.toString(),
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
                select: '_id name referenceUnit status',
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
        await assertActiveProductVariant({
            productVariantId: data.productVariantId,
            session,
        });
        if (
            article.productVariant.toString()
            !== data.productVariantId.toString()
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

    if (Object.hasOwn(data, 'packaging')) {
        article.packaging = normalizePackaging(data.packaging);
        changedFields.push('packaging');
    }

    if (changedFields.length === 0) {
        await article.populate([
            { path: 'supplier', select: '_id name scope status' },
            {
                path: 'productVariant',
                select: '_id name referenceUnit status',
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
            select: '_id name referenceUnit status',
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
            select: '_id name referenceUnit status',
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
    workspaceId = null,
    globalOnly = false,
    page = 1,
    limit = 20,
    search = null,
    status = SUPPLIER_RESOURCE_STATUS.ACTIVE,
    scope = null,
    supplierId = null,
    productVariantId = null,
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
    if (productVariantId) filter.productVariant = productVariantId;

    if (search) {
        const normalized = normalizeSupplierText(search);
        const normalizedRef = normalizeSupplierReference(search);
        filter.$or = mongoose.trusted([
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
        ]);
    }

    const skip = (page - 1) * limit;
    const query = SupplierArticle.find(filter)
        .populate({
            path: 'supplier',
            select: '_id name scope status',
        })
        .populate({
            path: 'productVariant',
            select: '_id name referenceUnit status',
        })
        .sort({ supplierReference: 1, _id: 1 })
        .skip(skip)
        .limit(limit);

    const [articles, total] = await Promise.all([
        query,
        SupplierArticle.countDocuments(filter),
    ]);

    return {
        articles: articles.map(serializeSupplierArticle),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getSupplierReferenceMetadata = () => ({
    scopes: Object.values(SUPPLIER_SCOPE),
    statuses: Object.values(SUPPLIER_RESOURCE_STATUS),
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
