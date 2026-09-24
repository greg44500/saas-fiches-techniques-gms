import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    reconcileM002BootstrapToV6,
} from '../../migrations/reconcileM002BootstrapToV6.migration.js';
import { CanonicalProduct } from '../../modules/productCatalog/canonicalProduct.model.js';
import { WorkspaceProduct } from '../../modules/productCatalog/workspaceProduct.model.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

describe('M-002 bootstrap v6 reconciliation', () => {
    it('archive une ancienne référence bootstrap absente du PDF et son Favori', async () => {
        const legacy = await createActiveProductReference({
            name: 'Moule',
            conservationType: 'FRAIS',
        });
        const favorite = await WorkspaceProduct.create({
            workspace: new mongoose.Types.ObjectId(),
            productVariant: legacy.variant._id,
            status: 'ACTIVE',
            createdBy: legacy.variant.createdBy,
            updatedBy: legacy.variant.updatedBy,
        });

        const result = await reconcileM002BootstrapToV6();

        expect(result.archivedVariants).toBeGreaterThanOrEqual(1);
        expect(result.archivedFavorites).toBeGreaterThanOrEqual(1);

        const archivedVariant = await legacy.variant.constructor
            .findById(legacy.variant._id)
            .lean();
        expect(archivedVariant.identityActive).toBe(false);
        expect(archivedVariant.status).toBe('ARCHIVED');

        expect((await WorkspaceProduct.findById(favorite._id)).status)
            .toBe('ARCHIVED');

        const archivedProduct = await CanonicalProduct.findById(
            legacy.product._id,
        ).lean();
        expect(archivedProduct.identityActive).toBe(false);
        expect(archivedProduct.status).toBe('ARCHIVED');
    });

    it('conserve une référence v6 lorsque sa racine correspond au dataset cible', async () => {
        const kept = await createActiveProductReference({
            name: 'Cumin moulu',
            conservationType: 'SEC',
        });

        await reconcileM002BootstrapToV6();

        const variant = await kept.variant.constructor
            .findById(kept.variant._id)
            .lean();
        expect(variant.identityActive).toBe(true);
        expect(variant.status).toBe('ACTIVE');
    });
});
