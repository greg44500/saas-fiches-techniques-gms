const PRODUCT_CATALOG_FEATURE = Object.freeze({
    REFERENCE_ACCESS: 'product_reference_access',
    CATALOG_IMPORT: 'product_catalog_import',
    CONTRIBUTION: 'product_contribution',
});

const PRODUCT_CATALOG_FEATURES = Object.freeze(
    Object.values(PRODUCT_CATALOG_FEATURE),
);

const PRODUCT_CATALOG_CAPABILITY_MODULE = Object.freeze({
    features: PRODUCT_CATALOG_FEATURES,
    featureDefinitions: Object.freeze({
        [PRODUCT_CATALOG_FEATURE.REFERENCE_ACCESS]: Object.freeze({
            label: 'Accès au référentiel Produits',
            description:
                'Permet de consulter le référentiel Produit partagé.',
            category: 'products',
            categoryLabel: 'Produits',
            displayOrder: 100,
            tags: Object.freeze([]),
        }),
        [PRODUCT_CATALOG_FEATURE.CATALOG_IMPORT]: Object.freeze({
            label: 'Import de données Produits',
            description:
                'Permet d’importer des données Produit CSV, XLS ou XLSX dans un Workspace.',
            category: 'products',
            categoryLabel: 'Produits',
            displayOrder: 110,
            tags: Object.freeze([]),
        }),
        [PRODUCT_CATALOG_FEATURE.CONTRIBUTION]: Object.freeze({
            label: 'Contribution au référentiel Produits',
            description:
                'Permet de proposer ou auto-publier des enrichissements Produit selon la politique de contribution du référentiel.',
            category: 'products',
            categoryLabel: 'Produits',
            displayOrder: 120,
            tags: Object.freeze([]),
        }),
    }),
});

export {
    PRODUCT_CATALOG_CAPABILITY_MODULE,
    PRODUCT_CATALOG_FEATURE,
    PRODUCT_CATALOG_FEATURES,
};
