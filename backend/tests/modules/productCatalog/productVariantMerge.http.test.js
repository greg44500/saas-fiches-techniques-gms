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
    bootstrapApplicationGlobalMember,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalMember.service.js';
import {
    syncApplicationGlobalSystemRole,
} from '../../../modules/applicationGlobalAuthorization/applicationGlobalRole.service.js';
import {
    createGlobalVariant,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
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
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    signAccessToken,
} from '../../../utils/jwt.js';

let governor;
let governorToken;

const createGovernor = async () => {
    governor = await User.create({
        firstName: 'Merge',
        lastName: 'Governor',
        email: 'merge-governor@example.test',
        emailCanonical: 'merge-governor@example.test',
    });
    governorToken = signAccessToken(
        governor._id.toString(),
        governor.passwordChangedAt,
    );

    const role = await syncApplicationGlobalSystemRole({
        roleData: {
            key: 'product_reference_merge_governor',
            name: 'Fusion Références Produit',
            description:
                'Administration de la fusion des Références Produit.',
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
};

const createHttpPair = async () => {
    const base = await createActiveProductReference({
        actorId: governor._id,
        name: 'Produit fusion HTTP',
        referenceName: 'Référence conservée HTTP',
        conservationType: 'SEC',
        referenceUnit: 'KG',
        yieldPercent: 100,
    });
    const replaced = await createGlobalVariant({
        actorId: governor._id,
        productId: base.product._id,
        variant: {
            name: 'Référence remplacée HTTP',
            conservationType: 'SEC',
            referenceUnit: 'KG',
            yieldPercent: 100,
        },
    });

    return {
        productId: base.product._id.toString(),
        retainedId: base.variant._id.toString(),
        replacedId: replaced.id,
    };
};

beforeEach(async () => {
    await createGovernor();
});

describe('M-002 fusion Références Produit HTTP', () => {
    it('réserve recherche, prévisualisation et fusion à la permission globale de gestion', async () => {
        const pair = await createHttpPair();
        const owner = await createWorkspaceOwnerFixture();

        const forbiddenCandidates = await request(app)
            .get(
                '/api/product-reference/'
                + pair.productId
                + '/variants/'
                + pair.replacedId
                + '/merge-candidates',
            )
            .set(bearer(owner.token));

        expect(forbiddenCandidates.status).toBe(403);

        const allowedCandidates = await request(app)
            .get(
                '/api/product-reference/'
                + pair.productId
                + '/variants/'
                + pair.replacedId
                + '/merge-candidates',
            )
            .query({ q: 'conservée' })
            .set(bearer(governorToken));

        expect(allowedCandidates.status).toBe(200);
        expect(allowedCandidates.body.data.candidates).toEqual([
            expect.objectContaining({
                id: pair.retainedId,
                name: 'Référence conservée HTTP',
                canBeRetained: true,
            }),
        ]);

        const forbiddenPreview = await request(app)
            .post(
                '/api/product-reference/'
                + pair.productId
                + '/variants/merge/preview',
            )
            .set(bearer(owner.token))
            .send({
                retainedVariantId: pair.retainedId,
                replacedVariantId: pair.replacedId,
            });

        expect(forbiddenPreview.status).toBe(403);

        const preview = await request(app)
            .post(
                '/api/product-reference/'
                + pair.productId
                + '/variants/merge/preview',
            )
            .set(bearer(governorToken))
            .send({
                retainedVariantId: pair.retainedId,
                replacedVariantId: pair.replacedId,
                targetName: 'Référence fusionnée HTTP',
            });

        expect(preview.status).toBe(200);
        expect(preview.body.data.preview.canMerge).toBe(true);

        const merged = await request(app)
            .post(
                '/api/product-reference/'
                + pair.productId
                + '/variants/merge',
            )
            .set(bearer(governorToken))
            .send({
                retainedVariantId: pair.retainedId,
                replacedVariantId: pair.replacedId,
                targetName: 'Référence fusionnée HTTP',
                previewFingerprint:
                    preview.body.data.preview.previewFingerprint,
            });

        expect(merged.status).toBe(200);
        expect(merged.body.data.result.retained).toMatchObject({
            id: pair.retainedId,
            name: 'Référence fusionnée HTTP',
        });
    });

    it('refuse une auto-fusion au niveau de la validation HTTP', async () => {
        const pair = await createHttpPair();

        const response = await request(app)
            .post(
                '/api/product-reference/'
                + pair.productId
                + '/variants/merge/preview',
            )
            .set(bearer(governorToken))
            .send({
                retainedVariantId: pair.retainedId,
                replacedVariantId: pair.retainedId,
            });

        expect(response.status).toBe(400);
    });
});
