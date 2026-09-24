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
    createWorkspaceVariant,
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
        expect(plural.results[0].variants).toHaveLength(1);
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
            botteResult.results[0].variants[0].variant.characteristics.map(
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

    it('retrouve un Produit à partir d une pièce / découpe seule', async () => {
        const reference = await createActiveProductReference({
            name: 'Bœuf recherche',
        });
        const paleron = await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            kind: 'CUT',
            name: 'Paleron',
        });

        await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: { characteristicIds: [paleron.id] },
        });

        const result = await referenceSearch('paleron');
        const combined = await referenceSearch('bœuf recherche paleron');

        expect(result.results).toHaveLength(1);
        expect(combined.results).toHaveLength(1);
        expect(result.results[0].product.name).toBe('Bœuf recherche');
        expect(
            result.results[0].variants[0].variant.characteristics,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'CUT',
                name: 'Paleron',
            }),
        ]));
    });

    it('retrouve la classification d usage PAI sans la confondre avec une Gamme', async () => {
        const reference = await createActiveProductReference({
            name: 'Purée recherche',
            usageType: 'PAI',
        });

        const result = await referenceSearch('pai');

        expect(result.results).toHaveLength(1);
        expect(result.results[0].product.id)
            .toBe(reference.product._id.toString());
        expect(result.results[0].variants[0].variant.usageType).toBe('PAI');
        expect(result.results[0].variants[0].variant.foodRange).toBe(1);
    });

    it('pagine le référentiel principal par Produit et non par déclinaison', async () => {
        const aubergine = await createActiveProductReference({
            name: 'Aubergine pagination',
        });
        const sliced = await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: aubergine.product._id,
            kind: 'PRESENTATION',
            name: 'Tranchée',
        });

        await createWorkspaceVariant({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            productId: aubergine.product._id,
            variant: {
                characteristicIds: [sliced.id],
                foodRange: 1,
                referenceUnit: 'KG',
            },
        });
        await createActiveProductReference({
            name: 'Betterave pagination',
        });

        const firstPage = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            page: 1,
            limit: 1,
        });

        expect(firstPage.pagination).toEqual({
            page: 1,
            limit: 1,
            total: 2,
            totalPages: 2,
        });
        expect(firstPage.results).toHaveLength(1);
        expect(firstPage.results[0].product.name).toBe('Aubergine pagination');
        expect(firstPage.results[0].variants).toHaveLength(2);
    });
});
