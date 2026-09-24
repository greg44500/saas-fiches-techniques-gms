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

const serializeVariety = (variety) => {
    if (!variety) return null;
    if (!variety._id) return { id: variety.toString() };

    return {
        id: variety._id.toString(),
        name: variety.name,
        aliases: [...(variety.aliases ?? [])],
        status: variety.status,
    };
};

const serializeCharacteristic = (characteristic) => {
    if (!characteristic?._id) {
        return { id: characteristic.toString() };
    }

    return {
        id: characteristic._id.toString(),
        kind: characteristic.kind,
        name: characteristic.name,
        aliases: [...(characteristic.aliases ?? [])],
        status: characteristic.status,
    };
};

const serializeVariant = (variant) => {
    const characteristics = (variant.characteristics ?? [])
        .map(serializeCharacteristic);
    const presentation = characteristics.find(
        ({ kind }) => kind === 'PRESENTATION',
    )?.name ?? null;

    return {
        id: variant._id.toString(),
        productId: (
            variant.canonicalProduct?._id
            ?? variant.canonicalProduct
        ).toString(),
        name: variant.name,
        variety: serializeVariety(variant.variety),
        characteristics,
        presentation,
        processingState: variant.processingState ?? null,
        conservationType: variant.conservationType,
        foodRange: variant.foodRange ?? null,
        referenceUnit: variant.referenceUnit,
        yieldPercent: variant.yieldPercent ?? null,
        status: variant.status,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
    };
};

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
    serializeCharacteristic,
    serializeProduct,
    serializeSearchResult,
    serializeVariant,
    serializeVariety,
    serializeWorkspaceProduct,
};
