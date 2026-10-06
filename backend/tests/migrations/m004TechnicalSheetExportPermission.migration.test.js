import '../setup.js';
import '../../config/applicationRolePermission.registry.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    backfillRegisteredSystemRolePermissions,
} from '../../migrations/backfillRegisteredSystemRolePermissions.migration.js';
import { Role } from '../../modules/role/role.model.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from '../../modules/technicalSheet/technicalSheetPermission.registry.js';
import {
    createWorkspaceOwnerFixture,
} from '../helpers/dossierTest.fixtures.js';

describe('migration M-004 permission export', () => {
    it('rétablit technical-sheet:export sur les rôles Owner système existants', async () => {
        const fixture =
            await createWorkspaceOwnerFixture();

        await Role.updateOne(
            {
                _id:
                    fixture.membership.role._id,
            },
            {
                $pull: {
                    permissions:
                        TECHNICAL_SHEET_PERMISSION
                            .EXPORT,
                },
            },
        );

        const before = await Role.findById(
            fixture.membership.role._id,
        ).lean();

        expect(
            before.permissions,
        ).not.toContain(
            TECHNICAL_SHEET_PERMISSION.EXPORT,
        );

        await backfillRegisteredSystemRolePermissions();

        const after = await Role.findById(
            fixture.membership.role._id,
        ).lean();

        expect(
            after.permissions,
        ).toContain(
            TECHNICAL_SHEET_PERMISSION.EXPORT,
        );
    });
});
