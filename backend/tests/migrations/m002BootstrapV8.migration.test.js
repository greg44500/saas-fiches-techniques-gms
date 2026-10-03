import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    loadBootstrapReconciliationContract,
    reconcileM002BootstrapToV8,
} from '../../migrations/reconcileM002BootstrapToV8.migration.js';
import { CanonicalProduct } from '../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductReferenceBootstrapRun,
} from '../../modules/productCatalog/productReferenceBootstrapRun.model.js';
import { WorkspaceProduct } from '../../modules/productCatalog/workspaceProduct.model.js';
import {
    normalizeProductText,
} from '../../modules/productCatalog/productCatalog.normalization.js';
import {
    createActiveProductReference,
} from '../helpers/productCatalogTest.fixtures.js';

describe('M-002 bootstrap v8 reconciliation', () => {
    it('cible explicitement le corpus détaillé v8', async () => {
        const contract = await loadBootstrapReconciliationContract();

        expect(
            contract.targetReferenceToProduct.get(
                normalizeProductText('Purée de mangue surgelée'),
            ),
        ).toBe(normalizeProductText('Mangue'));
        expect(
            contract.targetReferenceToProduct.get(
                normalizeProductText(
                    'Fond de tartelette sucré cru surgelé Ø 8,5 cm',
                ),
            ),
        ).toBe(normalizeProductText('Fond de tarte sucré'));
        expect(
            contract.targetReferenceToProduct.get(
                normalizeProductText('Amande en poudre blanche'),
            ),
        ).toBe(normalizeProductText('Amande'));
    });

    it('archive un ancien fond de tarte générique v7 et son Favori', async () => {
        const legacy = await createActiveProductReference({
            name: 'Fond de tarte sucré',
            referenceName: 'Fond de tarte sucré cru surgelé',
            conservationType: 'SURGELE',
            referenceUnit: 'UNIT',
        });
        const favorite = await WorkspaceProduct.create({
            workspace: new mongoose.Types.ObjectId(),
            productVariant: legacy.variant._id,
            status: 'ACTIVE',
            createdBy: legacy.variant.createdBy,
            updatedBy: legacy.variant.updatedBy,
        });

        const result = await reconcileM002BootstrapToV8();

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

    it('conserve une Référence v7 toujours présente dans le v8', async () => {
        const kept = await createActiveProductReference({
            name: 'Amande',
            referenceName: 'Amande en poudre blanche',
            conservationType: 'SEC',
            referenceUnit: 'KG',
        });

        await reconcileM002BootstrapToV8();

        const variant = await kept.variant.constructor
            .findById(kept.variant._id)
            .lean();
        expect(variant.identityActive).toBe(true);
        expect(variant.status).toBe('ACTIVE');
    });

    it('considère aussi le run v7 comme historique lors du nettoyage fail-closed', async () => {
        const legacy = await createActiveProductReference({
            name: 'Ancienne référence QA v7',
            conservationType: 'FRAIS',
        });

        await legacy.variant.constructor.collection.updateOne(
            { _id: legacy.variant._id },
            {
                $unset: {
                    name: '',
                    normalizedName: '',
                    conservationType: '',
                },
            },
        );

        await ProductReferenceBootstrapRun.create({
            version: 'm002-reference-v7',
            datasetHash: 'test-historical-bootstrap-v7',
            actor: legacy.variant.createdBy,
            categoryCount: 0,
            productCount: 0,
            varietyCount: 0,
            characteristicCount: 0,
            variantCount: 0,
            installedAt: new Date(Date.now() + 1_000),
        });

        const result = await reconcileM002BootstrapToV8();

        expect(result.archivedVariants).toBeGreaterThanOrEqual(1);

        const archived = await legacy.variant.constructor.collection.findOne({
            _id: legacy.variant._id,
        });
        expect(archived.identityActive).toBe(false);
        expect(archived.status).toBe('ARCHIVED');
    });
});
