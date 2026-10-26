import '../setup.js';

import { describe, expect, it } from 'vitest';
import { ensureM006ProcessSheetIndexes } from '../../migrations/ensureM006ProcessSheetIndexes.migration.js';
import { PROCESS_SHEET_PERMISSION } from '../../modules/process/processSheetPermission.registry.js';
import { Role } from '../../modules/role/role.model.js';
import {
    backfillRegisteredSystemRolePermissions,
} from '../../migrations/backfillRegisteredSystemRolePermissions.migration.js';
import { createWorkspaceOwnerFixture } from '../helpers/dossierTest.fixtures.js';

describe('M-006 — migration ProcessSheet', () => {
    it('installe quatre index attendus de manière idempotente', async () => {
        const first = await ensureM006ProcessSheetIndexes();
        const second = await ensureM006ProcessSheetIndexes();
        expect(first).toEqual(second);
        expect(first.ensured).toHaveLength(4);
    });
    it('rétablit les permissions du rôle Owner existant', async () => {
        const owner = await createWorkspaceOwnerFixture();
        await Role.updateOne({ _id: owner.membership.role._id }, {
            $pull: { permissions: PROCESS_SHEET_PERMISSION.CREATE },
        });
        await backfillRegisteredSystemRolePermissions();
        const role = await Role.findById(owner.membership.role._id);
        expect(role.permissions).toContain(PROCESS_SHEET_PERMISSION.CREATE);
    });
});
