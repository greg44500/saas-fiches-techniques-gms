const SUPPLIER_CATALOG_GLOBAL_PERMISSION = Object.freeze({
    READ: 'supplier:reference:read',
    MANAGE: 'supplier:reference:manage',
});

const SUPPLIER_CATALOG_GLOBAL_PERMISSION_MODULE = Object.freeze({
    permissions: Object.freeze([
        Object.freeze({
            key: SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
            label: 'Consulter le référentiel Fournisseurs global',
            category: 'suppliers',
            categoryLabel: 'Fournisseurs',
            description:
                'Consulter les Fournisseurs, Articles et catalogues du référentiel partagé.',
            reserved: false,
        }),
        Object.freeze({
            key: SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
            label: 'Gérer le référentiel Fournisseurs global',
            category: 'suppliers',
            categoryLabel: 'Fournisseurs',
            description:
                'Créer, importer, corriger et archiver le référentiel fournisseur partagé.',
            reserved: false,
        }),
    ]),
});

export {
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
    SUPPLIER_CATALOG_GLOBAL_PERMISSION_MODULE,
};
