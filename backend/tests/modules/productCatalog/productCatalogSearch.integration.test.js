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
import { ProductVariant } from '../../../modules/productCatalog/productVariant.model.js';

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
        expect(plural.results[0].variant).toBeTruthy();
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
            conservationType: 'SURGELE',
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
            result.results[0].variant.characteristics,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                kind: 'CUT',
                name: 'Paleron',
            }),
        ]));
    });

    it('retrouve PAI / PAE via la Gamme 6 sans usageType séparé', async () => {
        const reference = await createActiveProductReference({
            name: 'Purée recherche',
            foodRange: 6,
        });

        const result = await referenceSearch('pai');

        expect(result.results).toHaveLength(1);
        expect(result.results[0].product.id)
            .toBe(reference.product._id.toString());
        expect(result.results[0].variant.foodRange).toBe(6);
        expect(result.results[0].variant).not.toHaveProperty('usageType');
    });

    it('n expose jamais un CanonicalProduct sans Référence exploitable dans la liste Workspace', async () => {
        const orphan = await createActiveProductReference({
            name: 'Agneau racine sans référence',
        });
        await ProductVariant.deleteOne({ _id: orphan.variant._id });

        const result = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            page: 1,
            limit: 20,
        });

        expect(result.results).toEqual([]);
        expect(result.pagination.total).toBe(0);
    });

    it('pagine la liste opérationnelle par référence exploitable', async () => {
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
                name: 'Aubergine tranchée pagination',
                characteristicIds: [sliced.id],
                conservationType: 'FRAIS',
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
        const secondPage = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            page: 2,
            limit: 1,
        });

        expect(firstPage.pagination).toEqual({
            page: 1,
            limit: 1,
            total: 3,
            totalPages: 3,
        });
        expect(firstPage.results).toHaveLength(1);
        expect(secondPage.results).toHaveLength(1);
        expect(firstPage.results[0].product.name).toBe('Aubergine pagination');
        expect(secondPage.results[0].product.name).toBe('Aubergine pagination');
        expect(firstPage.results[0].variant.id)
            .not.toBe(secondPage.results[0].variant.id);
    });

    it('filtre et trie les références par Gamme', async () => {
        await createActiveProductReference({
            name: 'Courgette gamme trois',
            conservationType: 'SURGELE',
            foodRange: 3,
        });
        await createActiveProductReference({
            name: 'Navet gamme un',
            foodRange: 1,
        });

        const sorted = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            sort: 'FOOD_RANGE',
            page: 1,
            limit: 20,
        });
        const filtered = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            foodRange: 3,
            page: 1,
            limit: 20,
        });

        expect(sorted.results.map(({ variant }) => variant.foodRange))
            .toEqual([1, 3]);
        expect(filtered.results).toHaveLength(1);
        expect(filtered.results[0].product.name)
            .toBe('Courgette gamme trois');
        expect(filtered.results[0].variant.foodRange).toBe(3);

        const conservationFiltered = await listProductSearch({
            workspaceId: ownerContext.workspace._id,
            scope: 'REFERENCE',
            conservationType: 'SURGELE',
            page: 1,
            limit: 20,
        });
        expect(conservationFiltered.results).toHaveLength(1);
        expect(conservationFiltered.results[0].variant.conservationType)
            .toBe('SURGELE');
    });
});
