import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';

const PRODUCT_CATALOG_PERMISSION = Object.freeze({
    READ: 'product:read',
    CATALOG_MANAGE: 'product:catalog:manage',
    CONTRIBUTE: 'product:contribute',
});

const PRODUCT_CATALOG_PERMISSIONS = Object.freeze(
    Object.values(PRODUCT_CATALOG_PERMISSION),
);

const PRODUCT_CATALOG_ROLE_PERMISSION_MODULE = Object.freeze({
    permissions: PRODUCT_CATALOG_PERMISSIONS,
    reservedPermissions: Object.freeze([]),
    systemRolePermissions: Object.freeze({
        [SYSTEM_ROLE_KEY.OWNER]: PRODUCT_CATALOG_PERMISSIONS,
    }),
});

export {
    PRODUCT_CATALOG_PERMISSION,
    PRODUCT_CATALOG_PERMISSIONS,
    PRODUCT_CATALOG_ROLE_PERMISSION_MODULE,
};
