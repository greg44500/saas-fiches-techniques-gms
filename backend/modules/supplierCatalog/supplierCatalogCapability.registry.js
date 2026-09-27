const SUPPLIER_CATALOG_FEATURE = Object.freeze({
    CATALOG_IMPORT: 'supplier_catalog_import',
});

const SUPPLIER_CATALOG_FEATURES = Object.freeze(
    Object.values(SUPPLIER_CATALOG_FEATURE),
);

const SUPPLIER_CATALOG_CAPABILITY_MODULE = Object.freeze({
    features: SUPPLIER_CATALOG_FEATURES,
    featureDefinitions: Object.freeze({
        [SUPPLIER_CATALOG_FEATURE.CATALOG_IMPORT]: Object.freeze({
            label: 'Import de catalogues fournisseurs',
            description:
                'Permet d’importer un catalogue fournisseur privé CSV, XLS ou XLSX dans un Workspace.',
            category: 'suppliers',
            categoryLabel: 'Fournisseurs',
            displayOrder: 200,
            tags: Object.freeze([]),
        }),
    }),
});

export {
    SUPPLIER_CATALOG_CAPABILITY_MODULE,
    SUPPLIER_CATALOG_FEATURE,
    SUPPLIER_CATALOG_FEATURES,
};
