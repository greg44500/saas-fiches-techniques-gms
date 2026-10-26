import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';

const PROCESS_LIBRARY_KIND = Object.freeze({
    STEP: 'STEP',
    PHASE: 'PHASE',
});
const PROCESS_LIBRARY_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
});
const PROCESS_LIBRARY_PERMISSION = Object.freeze({
    READ: 'process-library:read',
    MANAGE_LOCAL: 'process-library:local:manage',
    MANAGE_WORKSPACE: 'process-library:workspace:manage',
    PUBLISH: 'process-library:publish',
});
const PROCESS_LIBRARY_PERMISSIONS = Object.freeze(
    Object.values(PROCESS_LIBRARY_PERMISSION),
);
const PROCESS_LIBRARY_ROLE_PERMISSION_MODULE = Object.freeze({
    permissions: PROCESS_LIBRARY_PERMISSIONS,
    reservedPermissions: Object.freeze([]),
    systemRolePermissions: Object.freeze({
        [SYSTEM_ROLE_KEY.OWNER]: PROCESS_LIBRARY_PERMISSIONS,
    }),
});

export {
    PROCESS_LIBRARY_KIND,
    PROCESS_LIBRARY_PERMISSION,
    PROCESS_LIBRARY_PERMISSIONS,
    PROCESS_LIBRARY_ROLE_PERMISSION_MODULE,
    PROCESS_LIBRARY_STATUS,
};
