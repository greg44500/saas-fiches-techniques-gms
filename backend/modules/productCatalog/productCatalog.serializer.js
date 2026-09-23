const serializeCategory = (category) => category
    ? {
        id: category._id.toString(),
        name: category.name,
        status: category.status,
    }
    : null;

const serializeProduct = (product) => ({
    id: product._id.toString(),
    name: product.name,
    aliases: [...(product.aliases ?? [])],
    category: serializeCategory(product.category),
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
});

const serializeVariant = (variant) => ({
    id: variant._id.toString(),
    productId: (
        variant.canonicalProduct?._id
        ?? variant.canonicalProduct
    ).toString(),
    presentation: variant.presentation ?? null,
    processingState: variant.processingState ?? null,
    foodRange: variant.foodRange ?? null,
    referenceUnit: variant.referenceUnit,
    yieldPercent: variant.yieldPercent ?? null,
    status: variant.status,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
});

const serializeWorkspaceProduct = (entry) => entry
    ? {
        id: entry._id.toString(),
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    }
    : null;

const serializeSearchResult = ({
    product,
    variant,
    workspaceEntry = null,
}) => ({
    source: 'CANONICAL_PRODUCT',
    product: serializeProduct(product),
    variant: serializeVariant(variant),
    workspaceEntry: serializeWorkspaceProduct(workspaceEntry),
});

export {
    serializeCategory,
    serializeProduct,
    serializeSearchResult,
    serializeVariant,
    serializeWorkspaceProduct,
};
