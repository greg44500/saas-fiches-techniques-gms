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
    User,
} from '../../../modules/users/user.model.js';
import {
    bearer,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    signAccessToken,
} from '../../../utils/jwt.js';

let superAdmin;
let superAdminToken;

beforeEach(async () => {
    superAdmin = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'super-admin-products@example.test',
        emailCanonical: 'super-admin-products@example.test',
        platformRole: PLATFORM_ROLE.SUPER_ADMIN,
    });
    superAdminToken = signAccessToken(
        superAdmin._id.toString(),
        superAdmin.passwordChangedAt,
    );
});

describe('M-002 Platform product catalog HTTP contract', () => {
    it('autorise le super-admin à créer et lire une catégorie', async () => {
        const created = await request(app)
            .post('/api/platform/products/categories')
            .set(bearer(superAdminToken))
            .send({
                name: 'Légumes',
            });

        expect(created.status).toBe(201);
        expect(created.body.data.category.name).toBe('Légumes');

        const listed = await request(app)
            .get('/api/platform/products/categories')
            .set(bearer(superAdminToken));

        expect(listed.status).toBe(200);
        expect(listed.body.data.categories).toEqual([
            expect.objectContaining({
                name: 'Légumes',
                status: 'ACTIVE',
            }),
        ]);
    });

    it('refuse la frontière Platform à un Owner Workspace ordinaire', async () => {
        const owner = await createWorkspaceOwnerFixture();

        const response = await request(app)
            .get('/api/platform/products/categories')
            .set(bearer(owner.token));

        expect(response.status).toBe(403);
    });

    it('valide les ObjectIds Platform avant le controller', async () => {
        const response = await request(app)
            .get('/api/platform/products/not-an-object-id')
            .set(bearer(superAdminToken));

        expect(response.status).toBe(400);
    });
});
