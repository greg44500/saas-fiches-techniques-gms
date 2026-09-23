import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    migrateM002VariantSemantics,
} from '../../migrations/migrateM002VariantSemantics.migration.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

const toLegacyVariant = async ({
    variantId,
    presentation,
    processingState,
    preservation,
    signature,
}) => ProductVariant.collection.updateOne(
    { _id: variantId },
    {
        $set: {
            form: presentation,
            normalizedForm: presentation.toLowerCase(),
            processingState,
            normalizedProcessingState: processingState.toLowerCase(),
            preservation,
            normalizedPreservation: preservation.toLowerCase(),
            normalizedSignature: signature,
        },
        $unset: {
            presentation: '',
            normalizedPresentation: '',
        },
    },
);

describe('M-002 variant semantics migration', () => {
    it('migre Forme/Conservation vers Présentation/Gamme/État et reste idempotente', async () => {
        const reference = await createActiveProductReference({
            presentation: 'Entière',
            foodRange: 1,
        });

        await toLegacyVariant({
            variantId: reference.variant._id,
            presentation: 'Entière',
            processingState: 'Brute',
            preservation: 'Fraîche',
            signature: 'entiere|brute|fraiche',
        });

        const first = await migrateM002VariantSemantics();
        const migrated = await ProductVariant.collection.findOne({
            _id: reference.variant._id,
        });

        expect(first.matchedCount).toBe(1);
        expect(migrated.presentation).toBe('Entière');
        expect(migrated.processingState).toBe('Produit frais');
        expect(migrated.normalizedSignature).toBe(
            'entiere|1|produit frais',
        );
        expect(migrated.form).toBeUndefined();
        expect(migrated.preservation).toBeUndefined();

        const second = await migrateM002VariantSemantics();
        expect(second.modifiedCount).toBe(0);
    });

    it('refuse une collision avant de fusionner silencieusement deux déclinaisons', async () => {
        const reference = await createActiveProductReference({
            presentation: 'Entière',
            foodRange: 1,
        });
        const actorId = reference.variant.createdBy;
        const secondId = new mongoose.Types.ObjectId();

        await toLegacyVariant({
            variantId: reference.variant._id,
            presentation: 'Entière',
            processingState: 'Brute',
            preservation: 'Fraîche',
            signature: 'entiere|brute|fraiche',
        });

        await ProductVariant.collection.insertOne({
            _id: secondId,
            canonicalProduct: reference.product._id,
            form: 'Entière',
            normalizedForm: 'entiere',
            processingState: 'Brute',
            normalizedProcessingState: 'brute',
            preservation: 'Surgelée',
            normalizedPreservation: 'surgelee',
            normalizedSignature: 'entiere|brute|surgelee',
            foodRange: 1,
            referenceUnit: 'KG',
            yieldPercent: null,
            status: 'ACTIVE',
            identityActive: true,
            contributedFromWorkspace: null,
            rejectionReason: null,
            rejectionComment: null,
            replacementVariant: null,
            createdBy: actorId,
            updatedBy: actorId,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await expect(migrateM002VariantSemantics()).rejects.toThrow(
            /deux déclinaisons actives deviennent identiques/,
        );

        const untouched = await ProductVariant.collection.findOne({
            _id: reference.variant._id,
        });
        expect(untouched.form).toBe('Entière');
        expect(untouched.presentation).toBeUndefined();
    });
});
