import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    reconcileM002LegacyReferenceDuplicates,
} from '../../migrations/reconcileM002LegacyReferenceDuplicates.migration.js';
import { ProductVariant } from '../../modules/productCatalog/productVariant.model.js';
import { WorkspaceProduct } from '../../modules/productCatalog/workspaceProduct.model.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

const insertLegacyDuplicate = async (reference) => {
    const id = new mongoose.Types.ObjectId();
    await ProductVariant.collection.insertOne({
        _id: id,
        canonicalProduct: reference.product._id,
        variety: null,
        characteristics: [],
        processingState: null,
        normalizedProcessingState: '',
        normalizedSignature: 'legacy-generic-' + id.toString(),
        foodRange: 1,
        referenceUnit: 'KG',
        yieldPercent: null,
        status: 'ACTIVE',
        identityActive: true,
        contributedFromWorkspace: null,
        rejectionReason: null,
        rejectionComment: null,
        replacementVariant: null,
        createdBy: reference.variant.createdBy,
        updatedBy: reference.variant.updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    return id;
};

describe('M-002 legacy reference duplicate reconciliation', () => {
    it('retire le doublon legacy et conserve le Favori Workspace', async () => {
        const reference = await createActiveProductReference({
            name: 'Banane',
            conservationType: 'FRAIS',
            foodRange: 1,
        });
        const legacyId = await insertLegacyDuplicate(reference);
        const workspaceId = new mongoose.Types.ObjectId();

        const legacyFavorite = await WorkspaceProduct.create({
            workspace: workspaceId,
            productVariant: legacyId,
            status: 'ACTIVE',
            createdBy: reference.variant.createdBy,
            updatedBy: reference.variant.updatedBy,
        });

        const first = await reconcileM002LegacyReferenceDuplicates();

        expect(first).toMatchObject({
            scanned: 1,
            reconciled: 1,
            favoritesMoved: 1,
            favoritesMerged: 0,
        });

        const legacy = await ProductVariant.collection.findOne({
            _id: legacyId,
        });
        expect(legacy).toMatchObject({
            name: 'Banane',
            normalizedName: 'banane',
            conservationType: 'FRAIS',
            status: 'ARCHIVED',
            identityActive: false,
        });
        expect(legacy.replacementVariant.toString())
            .toBe(reference.variant._id.toString());

        const favorite = await WorkspaceProduct.findById(legacyFavorite._id)
            .lean();
        expect(favorite.productVariant.toString())
            .toBe(reference.variant._id.toString());

        const second = await reconcileM002LegacyReferenceDuplicates();
        expect(second).toMatchObject({
            scanned: 0,
            reconciled: 0,
        });
    });

    it('fusionne deux liens Favori sans perdre un statut ACTIVE', async () => {
        const reference = await createActiveProductReference({
            name: 'Betterave',
            conservationType: 'FRAIS',
            foodRange: 1,
        });
        const legacyId = await insertLegacyDuplicate(reference);
        const workspaceId = new mongoose.Types.ObjectId();

        const targetFavorite = await WorkspaceProduct.create({
            workspace: workspaceId,
            productVariant: reference.variant._id,
            status: 'ARCHIVED',
            createdBy: reference.variant.createdBy,
            updatedBy: reference.variant.updatedBy,
        });
        const legacyFavorite = await WorkspaceProduct.create({
            workspace: workspaceId,
            productVariant: legacyId,
            status: 'ACTIVE',
            createdBy: reference.variant.createdBy,
            updatedBy: reference.variant.updatedBy,
        });

        await reconcileM002LegacyReferenceDuplicates();

        expect((await WorkspaceProduct.findById(targetFavorite._id)).status)
            .toBe('ACTIVE');
        expect((await WorkspaceProduct.findById(legacyFavorite._id)).status)
            .toBe('ARCHIVED');
    });
});
