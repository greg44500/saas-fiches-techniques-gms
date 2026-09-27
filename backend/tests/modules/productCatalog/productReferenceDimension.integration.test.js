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
    createProductCharacteristic,
    createProductVariety,
    updateProductCharacteristicStatus,
    updateProductVariety,
    updateProductVarietyStatus,
} from '../../../modules/productCatalog/productReferenceDimension.service.js';
import {
    ProductVariant,
} from '../../../modules/productCatalog/productVariant.model.js';
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

describe('M-002 ProductVariety / ProductCharacteristic', () => {
    it('déduplique une Variété dans son Produit mais autorise le même nom sur un autre Produit', async () => {
        const first = await createActiveProductReference({
            name: 'Pomme dimensions',
        });
        const second = await createActiveProductReference({
            name: 'Poire dimensions',
            categoryName: 'Fruits dimensions',
        });

        await expect(createProductVariety({
            actorId: ownerContext.owner._id,
            productId: first.product._id,
            name: 'Commune',
        })).resolves.toMatchObject({ name: 'Commune' });

        await expect(createProductVariety({
            actorId: ownerContext.owner._id,
            productId: first.product._id,
            name: 'commune',
        })).rejects.toMatchObject({ statusCode: 409 });

        await expect(createProductVariety({
            actorId: ownerContext.owner._id,
            productId: second.product._id,
            name: 'Commune',
        })).resolves.toMatchObject({ name: 'Commune' });
    });

    it('conserve la signature d une variante lorsqu une Variété est renommée', async () => {
        const reference = await createActiveProductReference({
            name: 'Pomme signature variété',
        });
        const variety = await createProductVariety({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            name: 'Golden',
        });

        await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: { varietyId: variety.id },
        });
        const before = await ProductVariant.findById(reference.variant._id)
            .lean();

        await updateProductVariety({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            varietyId: variety.id,
            name: 'Golden Delicious',
        });
        const after = await ProductVariant.findById(reference.variant._id)
            .lean();

        expect(after.normalizedSignature).toBe(before.normalizedSignature);

        await expect(updateProductVarietyStatus({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            varietyId: variety.id,
            status: 'ARCHIVED',
        })).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse d archiver une Caractéristique utilisée par une variante active', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte caractéristique utilisée',
        });
        const characteristic = await createProductCharacteristic({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            kind: 'SIZE_FORMAT',
            name: 'Mini',
        });

        await updateVariant({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            variantId: reference.variant._id,
            changes: { characteristicIds: [characteristic.id] },
        });

        await expect(updateProductCharacteristicStatus({
            actorId: ownerContext.owner._id,
            productId: reference.product._id,
            characteristicId: characteristic.id,
            status: 'ARCHIVED',
        })).rejects.toMatchObject({ statusCode: 409 });
    });
});
