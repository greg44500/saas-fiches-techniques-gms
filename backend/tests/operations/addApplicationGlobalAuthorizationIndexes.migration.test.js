import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    migrateApplicationGlobalAuthorizationIndexes,
} from '../../migrations/addApplicationGlobalAuthorizationIndexes.migration.js';
import {
    ApplicationGlobalMember,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js';
import {
    ApplicationGlobalRole,
} from '../../modules/applicationGlobalAuthorization/applicationGlobalRole.model.js';

describe('migrateApplicationGlobalAuthorizationIndexes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('provisionne explicitement les index requis en production', async () => {
        const roleCreateIndex = vi
            .spyOn(
                ApplicationGlobalRole.collection,
                'createIndex',
            )
            .mockImplementation(async (key, options) =>
                options.name);
        const memberCreateIndex = vi
            .spyOn(
                ApplicationGlobalMember.collection,
                'createIndex',
            )
            .mockImplementation(async (key, options) =>
                options.name);

        const result =
            await migrateApplicationGlobalAuthorizationIndexes();

        expect(roleCreateIndex).toHaveBeenCalledTimes(2);
        expect(memberCreateIndex).toHaveBeenCalledTimes(2);

        expect(memberCreateIndex).toHaveBeenCalledWith(
            { user: 1 },
            expect.objectContaining({
                unique: true,
                partialFilterExpression: {
                    status: {
                        $in: ['active', 'suspended'],
                    },
                },
            }),
        );

        expect(result.indexesEnsured).toEqual([
            'application_global_role_key_unique',
            'application_global_role_status_system',
            'application_global_current_member_user_unique',
            'application_global_member_status_role',
        ]);
    });
});
