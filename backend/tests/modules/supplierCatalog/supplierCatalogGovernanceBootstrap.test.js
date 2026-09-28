import '../../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    resolveApplicationGlobalAuthorization,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    ApplicationGlobalMember,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalMember.model.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/productCatalog/productCatalogGlobalPermission.registry.js';
import {
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/supplierCatalog/supplierCatalogGlobalPermission.registry.js';
import {
    seedM002ProductGovernance,
} from '../../../seeds/seedM002ProductGovernance.js';
import {
    BUSINESS_REFERENCE_GOVERNOR_ROLE,
    seedM003ReferenceGovernance,
} from '../../../seeds/seedM003ReferenceGovernance.js';
import {
    createTestUser,
} from '../../helpers/dossierTest.fixtures.js';

describe('M-003 reference governance bootstrap', () => {
    it('migre le governor M-002 vers une autorité combinée idempotente', async () => {
        const user = await createTestUser({
            email:
                'm003-governor@example.test',
        });

        const m002 =
            await seedM002ProductGovernance({
                userId: user._id,
            });

        const first =
            await seedM003ReferenceGovernance({
                userId: user._id,
            });
        const second =
            await seedM003ReferenceGovernance({
                userId: user._id,
            });

        expect(first.role.key).toBe(
            BUSINESS_REFERENCE_GOVERNOR_ROLE.key,
        );
        expect(first.member.id).toBe(
            m002.member.id,
        );
        expect(first.migrated).toBe(true);
        expect(second.member.id).toBe(
            first.member.id,
        );
        expect(second.migrated).toBe(false);

        const currentMemberships =
            await ApplicationGlobalMember.countDocuments({
                user: user._id,
                status:
                    mongoose.trusted({
                        $in: [
                            'active',
                            'suspended',
                        ],
                    }),
            });

        expect(currentMemberships).toBe(1);

        const authorization =
            await resolveApplicationGlobalAuthorization({
                user,
            });

        expect(authorization.permissions).toEqual(
            expect.arrayContaining([
                PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
                PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
                SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
                SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
            ]),
        );
    });
});
