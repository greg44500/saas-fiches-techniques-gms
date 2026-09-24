import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    migrateM002VariantCharacteristics,
} from '../../migrations/migrateM002VariantCharacteristics.migration.js';
import {
    ProductCharacteristic,
} from '../../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

describe('M-002 variant characteristics migration', () => {
    it('migre une Présentation historique vers ProductCharacteristic et reste idempotente', async () => {
        const reference = await createActiveProductReference({
            name: 'Carotte historique',
            presentation: null,
            foodRange: 1,
        });

        await ProductVariant.collection.updateOne(
            { _id: reference.variant._id },
            {
                $set: {
                    presentation: 'Râpée',
                    normalizedPresentation: 'rapee',
                    normalizedSignature: 'rapee|1|produit frais',
                },
                $unset: { characteristics: '' },
            },
        );

        const first = await migrateM002VariantCharacteristics();
        const migrated = await ProductVariant.collection.findOne({
            _id: reference.variant._id,
        });
        const characteristic = await ProductCharacteristic.findOne({
            canonicalProduct: reference.product._id,
            kind: 'PRESENTATION',
            normalizedName: 'rapee',
        });

        expect(first).toEqual(expect.objectContaining({
            matchedCount: 1,
            modifiedCount: 1,
            createdCharacteristics: 1,
        }));
        expect(characteristic).not.toBeNull();
        expect(migrated.presentation).toBeUndefined();
        expect(migrated.variety).toBeNull();
        expect(migrated.characteristics.map(String))
            .toEqual([characteristic._id.toString()]);
        expect(migrated.normalizedSignature)
            .toContain(`PRESENTATION:${characteristic._id.toString()}`);

        const second = await migrateM002VariantCharacteristics();
        expect(second.modifiedCount).toBe(0);
        expect(second.createdCharacteristics).toBe(0);
    });

    it('refuse une collision de signatures structurées sans fusion silencieuse', async () => {
        const first = await createActiveProductReference({
            name: 'Carotte collision caractéristiques',
            presentation: null,
            foodRange: 1,
        });
        const second = await ProductVariant.create({
            canonicalProduct: first.product._id,
            name: 'Carotte collision caractéristiques seconde',
            normalizedName: 'carotte collision caracteristiques seconde',
            conservationType: 'CONSERVE',
            variety: null,
            characteristics: [],
            processingState: 'Conserve',
            normalizedProcessingState: 'conserve',
            normalizedSignature: 'legacy-second',
            foodRange: 1,
            referenceUnit: 'KG',
            status: 'ACTIVE',
            createdBy: first.variant.createdBy,
            updatedBy: first.variant.updatedBy,
        });

        await ProductVariant.collection.updateOne(
            { _id: first.variant._id },
            {
                $set: {
                    presentation: 'Entière',
                    normalizedPresentation: 'entiere',
                    normalizedSignature: 'legacy-first',
                },
                $unset: { characteristics: '' },
            },
        );
        await ProductVariant.collection.updateOne(
            { _id: second._id },
            {
                $set: {
                    presentation: 'Entière',
                    normalizedPresentation: 'entiere',
                    processingState: 'Produit frais',
                    normalizedProcessingState: 'produit frais',
                },
                $unset: { characteristics: '' },
            },
        );

        await expect(migrateM002VariantCharacteristics()).rejects.toThrow(
            /deux déclinaisons actives deviennent identiques/,
        );

        const untouched = await ProductVariant.collection.findOne({
            _id: first.variant._id,
        });
        expect(untouched.presentation).toBe('Entière');
    });
});
