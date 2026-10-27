import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';

const PROCESS_SHEET_PERMISSION = Object.freeze({
    READ: 'process-sheet:read',
    CREATE: 'process-sheet:create',
    EDIT: 'process-sheet:edit',
    VALIDATE: 'process-sheet:validate',
});

const PROCESS_SHEET_ROLE_PERMISSION_MODULE = Object.freeze({
    permissions: Object.freeze(Object.values(PROCESS_SHEET_PERMISSION)),
    reservedPermissions: Object.freeze([]),
    systemRolePermissions: Object.freeze({
        [SYSTEM_ROLE_KEY.OWNER]: Object.freeze(Object.values(PROCESS_SHEET_PERMISSION)),
    }),
});

export { PROCESS_SHEET_PERMISSION, PROCESS_SHEET_ROLE_PERMISSION_MODULE };
