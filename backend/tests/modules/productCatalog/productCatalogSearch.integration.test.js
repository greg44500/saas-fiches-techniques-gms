import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    updateVariant,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    listProductSearch,
} from '../../../modules/productCatalog/productCatalog.service.js';
import {
    createProductCharacteristic,
    createProductVariety,
} from '../../../modules/productCatalog/productReferenceDimension.service.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';

let ownerContext;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
});

const referenceSearch = (q) => listProductSearch({
    workspaceId: ownerContext.workspace._id,
    scope: 'REFERENCE',
    q,
    page: 1,
    limit: 20,
});

describe('M-002 recherche structurée Produit', () => {
    it('retrouve Carotte par pluriel et faute mineure', async () => {
        await createActiveProductReference({
            name: 'Carotte',
            presentation: 'Entière',
        });

        const plural = await referenceSearch('carottes');
        const typo = await referenceSearch('carote');

        expect(plural.results.some(
            ({ product }) => product.name === 'Carotte',
        )).toBe(true);
        expect(typo.results.some(
            ({ product }) => product.name === 'Carotte',
        )).toBe(true);
    });

    it('décompose carotte botte et mini carotte via les Caractéristiques', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte recherche',
        });
        const botte = await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            kind: 'PRESENTATION',
            name: 'En botte avec fanes',
        });
        const mini = await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            kind: 'SIZE_FORMAT',
            name: 'Mini',
        });

        await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: { characteristicIds: [botte.id, mini.id] },
        });

        const botteResult = await referenceSearch(
            'carotte recherche botte',
        );
        const miniResult = await referenceSearch(
            'mini carotte recherche',
        );

        expect(botteResult.results).toHaveLength(1);
        expect(miniResult.results).toHaveLength(1);
        expect(
            botteResult.results[0].variant.characteristics.map(
                ({ kind }) => kind,
            ),
        ).toEqual(expect.arrayContaining([
            'PRESENTATION',
            'SIZE_FORMAT',
        ]));
    });

    it('retrouve une Variété et une Gamme sans créer de CanonicalProduct artificiel', async () => {
        const pomme = await createActiveProductReference({
            name: 'Pomme recherche',
        });
        const golden = await createProductVariety({
            actorId: ownerContext.owner._id,
            productId: pomme.product._id,
            name: 'Golden',
        });

        await updateVariant({
            actorId: ownerContext.owner._id,
            productId: pomme.product._id,
            variantId: pomme.variant._id,
            changes: { varietyId: golden.id },
        });

        const goldenResult = await referenceSearch(
            'pomme recherche golden',
        );
        expect(goldenResult.results).toHaveLength(1);
        expect(goldenResult.results[0].product.name)
            .toBe('Pomme recherche');

        const carotte = await createActiveProductReference({
            name: 'Carotte surgelée recherche',
            foodRange: 3,
        });
        const frozenResult = await referenceSearch(
            'carotte surgelée recherche',
        );
        expect(frozenResult.results.some(
            ({ product }) => product.id === carotte.product._id.toString(),
        )).toBe(true);
    });
});
