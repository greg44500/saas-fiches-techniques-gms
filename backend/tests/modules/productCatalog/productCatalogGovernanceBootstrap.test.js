import '../../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    resolveApplicationGlobalAuthorization,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/productCatalog/productCatalogGlobalPermission.registry.js';
import {
    PRODUCT_REFERENCE_GOVERNOR_ROLE,
    seedM002ProductGovernance,
} from '../../../seeds/seedM002ProductGovernance.js';
import {
    createTestUser,
} from '../../helpers/dossierTest.fixtures.js';

describe('M-002 product governance bootstrap', () => {
    it('crée explicitement un rôle et un membership global idempotents', async () => {
        const user = await createTestUser({
            email: 'm002-governor@example.test',
        });

        const first =
            await seedM002ProductGovernance({
                userId: user._id,
            });
        const second =
            await seedM002ProductGovernance({
                userId: user._id,
            });

        expect(first.role.key).toBe(
            PRODUCT_REFERENCE_GOVERNOR_ROLE.key,
        );
        expect(second.role.id).toBe(first.role.id);
        expect(second.member.id).toBe(
            first.member.id,
        );

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
            });

        expect(authorization.permissions).toEqual(
            expect.arrayContaining([
                PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
                PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
            ]),
        );
    });
});
