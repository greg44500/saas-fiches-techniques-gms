const decimalToString = (value) => (
    value === null || value === undefined
        ? null
        : value.toString()
);

const serializePackaging = (packaging) => packaging
    ? {
        containerType: packaging.containerType ?? null,
        unitCount: packaging.unitCount ?? null,
        quantityPerUnit: decimalToString(packaging.quantityPerUnit),
        unit: packaging.unit ?? null,
        totalQuantity: decimalToString(packaging.totalQuantity),
        netWeight: decimalToString(packaging.netWeight),
        netWeightUnit: packaging.netWeightUnit ?? null,
        drainedNetWeight: decimalToString(packaging.drainedNetWeight),
        drainedNetWeightUnit: packaging.drainedNetWeightUnit ?? null,
        supplierLabel: packaging.supplierLabel ?? null,
    }
    : null;

const serializeSupplier = (supplier) => ({
    id: supplier._id.toString(),
    scope: supplier.scope,
    workspaceId: supplier.workspace?.toString() ?? null,
    name: supplier.name,
    supplierCode: supplier.supplierCode ?? null,
    legalName: supplier.legalName ?? null,
    website: supplier.website ?? null,
    status: supplier.status,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
});

const serializeArticleSupplier = (supplier) => {
    if (!supplier) return null;
    if (!supplier._id) return { id: supplier.toString() };

    return {
        id: supplier._id.toString(),
        name: supplier.name,
        scope: supplier.scope,
        status: supplier.status,
    };
};

const serializeArticleProduct = (productVariant) => {
    if (!productVariant) return null;
    if (!productVariant._id) {
        return { id: productVariant.toString() };
    }

    return {
        id: productVariant._id.toString(),
        name: productVariant.name,
        referenceUnit: productVariant.referenceUnit,
        status: productVariant.status,
    };
};

const serializeSupplierArticle = (article) => ({
    id: article._id.toString(),
    scope: article.scope,
    workspaceId: article.workspace?.toString() ?? null,
    supplier: serializeArticleSupplier(article.supplier),
    productVariant: serializeArticleProduct(article.productVariant),
    supplierReference: article.supplierReference,
    supplierDesignation: article.supplierDesignation ?? null,
    brand: article.brand ?? null,
    packaging: serializePackaging(article.packaging),
    status: article.status,
    replacedById: article.replacedBy?.toString() ?? null,
    provenance: article.provenance ?? null,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
});

export {
    decimalToString,
    serializePackaging,
    serializeSupplier,
    serializeSupplierArticle,
};
