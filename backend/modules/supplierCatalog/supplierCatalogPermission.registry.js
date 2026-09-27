import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';

const SUPPLIER_CATALOG_PERMISSION = Object.freeze({
    SUPPLIER_READ: 'supplier:read',
    SUPPLIER_MANAGE: 'supplier:manage',
    ARTICLE_READ: 'supplier:article:read',
    ARTICLE_MANAGE: 'supplier:article:manage',
    CATALOG_READ: 'supplier:catalog:read',
    CATALOG_IMPORT: 'supplier:catalog:import',
    CATALOG_MANAGE: 'supplier:catalog:manage',
    NEGOTIATED_PRICE_READ: 'supplier:negotiated-price:read',
    NEGOTIATED_PRICE_MANAGE: 'supplier:negotiated-price:manage',
    INVOICED_PRICE_READ: 'supplier:invoiced-price:read',
    INVOICED_PRICE_MANAGE: 'supplier:invoiced-price:manage',
    INVOICED_PRICE_VALIDATE: 'supplier:invoiced-price:validate',
    DOSSIER_REFERENCE_READ: 'supplier:dossier-reference:read',
    DOSSIER_REFERENCE_MANAGE: 'supplier:dossier-reference:manage',
    APPLICABLE_PRICE_READ: 'supplier:applicable-price:read',
    PRICE_POLICY_MANAGE: 'supplier:price-policy:manage',
});

const SUPPLIER_CATALOG_PERMISSIONS = Object.freeze(
    Object.values(SUPPLIER_CATALOG_PERMISSION),
);

const SUPPLIER_CATALOG_ROLE_PERMISSION_MODULE = Object.freeze({
    permissions: SUPPLIER_CATALOG_PERMISSIONS,
    reservedPermissions: Object.freeze([]),
    systemRolePermissions: Object.freeze({
        [SYSTEM_ROLE_KEY.OWNER]: SUPPLIER_CATALOG_PERMISSIONS,
    }),
});

export {
    SUPPLIER_CATALOG_PERMISSION,
    SUPPLIER_CATALOG_PERMISSIONS,
    SUPPLIER_CATALOG_ROLE_PERMISSION_MODULE,
};
