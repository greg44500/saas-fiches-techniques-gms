import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';

const TECHNICAL_SHEET_PERMISSION = Object.freeze({
    READ: 'technical-sheet:read',
    CREATE: 'technical-sheet:create',
    UPDATE: 'technical-sheet:update',
    SOURCING_MANAGE: 'technical-sheet:sourcing:manage',
    VALUATION_MANAGE: 'technical-sheet:valuation:manage',
    VALIDATE: 'technical-sheet:validate',
    LIFECYCLE_MANAGE: 'technical-sheet:lifecycle:manage',
    DELETE: 'technical-sheet:delete',
    RESTORE: 'technical-sheet:restore',
    PURGE: 'technical-sheet:purge',
    COPY: 'technical-sheet:copy',
    EXPORT: 'technical-sheet:export',
    SETTINGS_MANAGE: 'technical-sheet:settings:manage',
});

const TECHNICAL_SHEET_PERMISSIONS = Object.freeze(
    Object.values(TECHNICAL_SHEET_PERMISSION),
);

const TECHNICAL_SHEET_ROLE_PERMISSION_MODULE = Object.freeze({
    permissions: TECHNICAL_SHEET_PERMISSIONS,
    reservedPermissions: Object.freeze([]),
    systemRolePermissions: Object.freeze({
        [SYSTEM_ROLE_KEY.OWNER]: TECHNICAL_SHEET_PERMISSIONS,
    }),
});

export {
    TECHNICAL_SHEET_PERMISSION,
    TECHNICAL_SHEET_PERMISSIONS,
    TECHNICAL_SHEET_ROLE_PERMISSION_MODULE,
};
