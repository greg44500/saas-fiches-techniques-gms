const PRODUCT_CATALOG_GLOBAL_PERMISSION = Object.freeze({
    READ: 'product:reference:read',
    MANAGE: 'product:reference:manage',
});

const PRODUCT_CATALOG_GLOBAL_PERMISSION_MODULE = Object.freeze({
    permissions: Object.freeze([
        Object.freeze({
            key: PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
            label: 'Consulter le référentiel Produits global',
            category: 'products',
            categoryLabel: 'Produits',
            description:
                'Consulter les Produits, déclinaisons, catégories, contributions et événements du référentiel partagé.',
            reserved: false,
        }),
        Object.freeze({
            key: PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
            label: 'Gérer le référentiel Produits global',
            category: 'products',
            categoryLabel: 'Produits',
            description:
                'Valider, corriger, archiver et administrer le référentiel Produit partagé.',
            reserved: false,
        }),
    ]),
});

export {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
    PRODUCT_CATALOG_GLOBAL_PERMISSION_MODULE,
};
