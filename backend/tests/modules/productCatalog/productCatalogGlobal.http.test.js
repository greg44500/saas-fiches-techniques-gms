import '../../setup.js';

import request from 'supertest';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock(
    '../../../services/malwareScan/malwareScan.service.js',
    () => ({
        malwareScanService: {
            scanFile: vi.fn().mockResolvedValue({
                status: 'clean',
                provider: 'test-scanner',
                scannedAt: new Date('2026-09-23T12:00:00.000Z'),
                threatName: null,
                errorCode: null,
            }),
        },
    }),
);

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
let governorRole;

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

    governorRole = await syncApplicationGlobalSystemRole({
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
        roleId: governorRole.id,
        actorId: governor._id,
    });
});

describe('M-002 global product reference HTTP contract', () => {
    it('expose uniquement les permissions Produit globales de l’utilisateur courant', async () => {
        const governorAccess = await request(app)
            .get('/api/product-reference/access')
            .set(bearer(governorToken));

        expect(governorAccess.status).toBe(200);
        expect(governorAccess.body.data.access.permissions).toEqual([
            PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
            PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
        ]);

        const platformAdmin = await createUserToken({
            email: 'platform-access-only@example.test',
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        });

        const platformAccess = await request(app)
            .get('/api/product-reference/access')
            .set(bearer(platformAdmin.token));

        expect(platformAccess.status).toBe(200);
        expect(platformAccess.body.data.access.permissions).toEqual([]);
    });

    it('permet à un membre Platform explicitement habilité d’abonder le référentiel', async () => {
        const platformMember = await createUserToken({
            email: 'platform-product-governor@example.test',
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        });

        await bootstrapApplicationGlobalMember({
            userId: platformMember.user._id,
            roleId: governorRole.id,
            actorId: governor._id,
        });

        const category = await request(app)
            .post('/api/product-reference/categories')
            .set(bearer(platformMember.token))
            .send({ name: 'Légumes' });

        expect(category.status).toBe(201);

        const duplicateCheck = await request(app)
            .post('/api/product-reference/duplicate-check')
            .set(bearer(platformMember.token))
            .send({ name: 'Carotte', aliases: [] });

        expect(duplicateCheck.status).toBe(200);
        expect(duplicateCheck.body.data.exactMatch).toBeNull();

        const created = await request(app)
            .post('/api/product-reference')
            .set(bearer(platformMember.token))
            .send({
                name: 'Carotte',
                categoryId: category.body.data.category.id,
                variant: {
                    presentation: 'Râpée',
                    foodRange: 1,
                    referenceUnit: 'KG',
                },
            });

        expect(created.status).toBe(201);
        expect(created.body.data.product.status).toBe('ACTIVE');
        expect(created.body.data.variant.presentation).toBe('Râpée');
        expect(created.body.data.variant.characteristics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    kind: 'PRESENTATION',
                    name: 'Râpée',
                }),
            ]),
        );
    });

    it('crée une identité Produit globale sans variante artificielle', async () => {
        const category = await request(app)
            .post('/api/product-reference/categories')
            .set(bearer(governorToken))
            .send({ name: 'Viandes racines' });

        const created = await request(app)
            .post('/api/product-reference')
            .set(bearer(governorToken))
            .send({
                name: 'Bœuf racine',
                categoryId: category.body.data.category.id,
            });

        expect(created.status).toBe(201);
        expect(created.body.data.product.name).toBe('Bœuf racine');
        expect(created.body.data.variant).toBeNull();

        const listed = await request(app)
            .get('/api/product-reference')
            .query({ q: 'Bœuf racine' })
            .set(bearer(governorToken));

        expect(listed.status).toBe(200);
        expect(listed.body.data.products).toEqual([
            expect.objectContaining({
                name: 'Bœuf racine',
                variants: [],
            }),
        ]);
    });

    it('recherche le référentiel global par une dimension CUT seule', async () => {
        const category = await request(app)
            .post('/api/product-reference/categories')
            .set(bearer(governorToken))
            .send({ name: 'Viandes recherche' });

        const product = await request(app)
            .post('/api/product-reference')
            .set(bearer(governorToken))
            .send({
                name: 'Bœuf dimension',
                categoryId: category.body.data.category.id,
            });

        const cut = await request(app)
            .post(
                '/api/product-reference/'
                + product.body.data.product.id
                + '/characteristics',
            )
            .set(bearer(governorToken))
            .send({
                kind: 'CUT',
                name: 'Paleron',
            });

        await request(app)
            .post(
                '/api/product-reference/'
                + product.body.data.product.id
                + '/variants',
            )
            .set(bearer(governorToken))
            .send({
                characteristicIds: [cut.body.data.characteristic.id],
                foodRange: 1,
                referenceUnit: 'KG',
            })
            .expect(201);

        const listed = await request(app)
            .get('/api/product-reference')
            .query({ q: 'paleron' })
            .set(bearer(governorToken));

        expect(listed.status).toBe(200);
        expect(listed.body.data.products).toHaveLength(1);
        expect(listed.body.data.products[0].name).toBe('Bœuf dimension');
        expect(
            listed.body.data.products[0].variants[0].characteristics,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'CUT',
                name: 'Paleron',
            }),
        ]));
    });

    it('inspecte et prévisualise un import global via le pipeline sécurisé', async () => {
        const category = await request(app)
            .post('/api/product-reference/categories')
            .set(bearer(governorToken))
            .send({ name: 'Import global' });

        expect(category.status).toBe(201);

        const inspect = await request(app)
            .post('/api/product-reference/imports/inspect')
            .set(bearer(governorToken))
            .attach(
                'file',
                Buffer.from('Produit\nPanais global', 'utf8'),
                'produits.csv',
            );

        expect(inspect.status).toBe(201);
        expect(inspect.body.data.scope).toBe('GLOBAL');

        const preview = await request(app)
            .post(
                '/api/product-reference/imports/'
                + inspect.body.data.importId
                + '/preview',
            )
            .set(bearer(governorToken))
            .send({
                mapping: { name: 0 },
                defaults: {
                    referenceUnit: 'KG',
                    categoryId: category.body.data.category.id,
                    foodRange: 1,
                },
            });

        expect(preview.status).toBe(200);
        expect(preview.body.data.counts.CREATE_PRODUCT).toBe(1);
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
