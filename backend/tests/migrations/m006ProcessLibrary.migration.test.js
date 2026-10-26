import '../setup.js';

import { describe, expect, it } from 'vitest';

import { Role } from '../../modules/role/role.model.js';
import {
    PROCESS_LIBRARY_PERMISSIONS,
} from '../../modules/process/processLibrary.registry.js';
import {
    ensureM006ProcessLibraryIndexes,
} from '../../migrations/ensureM006ProcessLibraryIndexes.migration.js';
import {
    backfillRegisteredSystemRolePermissions,
} from '../../migrations/backfillRegisteredSystemRolePermissions.migration.js';
import {
    createWorkspaceOwnerFixture,
} from '../helpers/dossierTest.fixtures.js';

describe('M-006 — indexes et permissions de migration', () => {
    it('installe de façon idempotente les indexes des modèles et des révisions', async () => {
        const first = await ensureM006ProcessLibraryIndexes();
        const second = await ensureM006ProcessLibraryIndexes();
        expect(first.ensured).toEqual(second.ensured);
        expect(first.ensured).toHaveLength(4);
    });

    it('rétablit les permissions M-006 du rôle système Owner sans toucher aux personnalisés', async () => {
        const owner = await createWorkspaceOwnerFixture();
        await Role.updateOne(
            { _id: owner.membership.role._id },
            { $pull: { permissions: { $in: PROCESS_LIBRARY_PERMISSIONS } } },
        );
        const roleBefore = await Role.findById(owner.membership.role._id);
        expect(roleBefore.permissions.some((permission) =>
            PROCESS_LIBRARY_PERMISSIONS.includes(permission),
        )).toBe(false);

        await backfillRegisteredSystemRolePermissions();
        await backfillRegisteredSystemRolePermissions();
        const roleAfter = await Role.findById(owner.membership.role._id);
        expect(roleAfter.permissions).toEqual(
            expect.arrayContaining(PROCESS_LIBRARY_PERMISSIONS),
        );
    });
});
