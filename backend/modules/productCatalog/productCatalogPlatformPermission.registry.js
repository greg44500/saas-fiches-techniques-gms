import {
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';

const PRODUCT_CATALOG_PLATFORM_PERMISSION = Object.freeze({
    READ: 'platform:products:read',
    MANAGE: 'platform:products:manage',
});

const PRODUCT_CATALOG_PLATFORM_PERMISSION_MODULE = Object.freeze({
    permissions: Object.freeze([
        Object.freeze({
            key: PRODUCT_CATALOG_PLATFORM_PERMISSION.READ,
            label: 'Consulter le référentiel Produits',
            category: 'products',
            categoryLabel: 'Produits',
            description: 'Consulter les Produits, déclinaisons, catégories et contributions.',
            sensitivity: PLATFORM_PERMISSION_SENSITIVITY.DELEGABLE,
        }),
        Object.freeze({
            key: PRODUCT_CATALOG_PLATFORM_PERMISSION.MANAGE,
            label: 'Gérer le référentiel Produits',
            category: 'products',
            categoryLabel: 'Produits',
            description: 'Valider, corriger et administrer le référentiel Produit partagé.',
            sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
        }),
    ]),
});

export {
    PRODUCT_CATALOG_PLATFORM_PERMISSION,
    PRODUCT_CATALOG_PLATFORM_PERMISSION_MODULE,
};
