import '../../setup.js';

import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { app } from '../../../app.js';
import {
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';
import {
    bootstrapApplicationGlobalMember,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalMember.service.js';
import {
    syncApplicationGlobalSystemRole,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalRole.service.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from '../../../modules/productCatalog/productCatalogGlobalPermission.registry.js';
import {
    User,
} from '../../../modules/users/user.model.js';
import {
    bearer,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    signAccessToken,
} from '../../../utils/jwt.js';

let governor;
let governorToken;

const createUserToken = async ({
    email,
    platformRole = null,
}) => {
    const user = await User.create({
        firstName: 'Global',
        lastName: 'User',
        email,
        emailCanonical: email.toLowerCase(),
        ...(platformRole ? { platformRole } : {}),
    });

    return {
        user,
        token: signAccessToken(
            user._id.toString(),
            user.passwordChangedAt,
        ),
    };
};

beforeEach(async () => {
    const context = await createUserToken({
        email: 'product-governor@example.test',
    });
    governor = context.user;
    governorToken = context.token;

    const role = await syncApplicationGlobalSystemRole({
        roleData: {
            key: 'product_reference_governor',
            name: 'Gouvernance référentiel Produits',
            description:
                'Administration métier du référentiel Produit partagé.',
            permissions: [
                PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
                PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
            ],
        },
        actorId: governor._id,
    });

    await bootstrapApplicationGlobalMember({
        userId: governor._id,
        roleId: role.id,
        actorId: governor._id,
    });
});

describe('M-002 global product reference HTTP contract', () => {
    it('autorise un gouverneur métier explicite à gérer le référentiel', async () => {
        const created = await request(app)
            .post('/api/product-reference/categories')
            .set(bearer(governorToken))
            .send({
                name: 'Légumes',
            });

        expect(created.status).toBe(201);
        expect(created.body.data.category.name).toBe('Légumes');

        const metadata = await request(app)
            .get('/api/product-reference/metadata')
            .set(bearer(governorToken));

        expect(metadata.status).toBe(200);
        expect(metadata.body.data.metadata.categories).toEqual([
            expect.objectContaining({
                name: 'Légumes',
                status: 'ACTIVE',
            }),
        ]);
    });

    it('ne donne aucun droit métier global implicite à un Super Admin Platform', async () => {
        const platformAdmin = await createUserToken({
            email: 'platform-only@example.test',
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        });

        const response = await request(app)
            .get('/api/product-reference/categories')
            .set(bearer(platformAdmin.token));

        expect(response.status).toBe(403);
    });

    it('ne donne aucun droit métier global implicite à un Owner Workspace', async () => {
        const owner = await createWorkspaceOwnerFixture();

        const response = await request(app)
            .get('/api/product-reference/categories')
            .set(bearer(owner.token));

        expect(response.status).toBe(403);
    });

    it('valide les ObjectIds avant le controller global', async () => {
        const response = await request(app)
            .get('/api/product-reference/not-an-object-id')
            .set(bearer(governorToken));

        expect(response.status).toBe(400);
    });
});
