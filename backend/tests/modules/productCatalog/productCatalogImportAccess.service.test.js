import '../../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    collectProductImportCommitRequirements,
    resolveProductImportCommitRequirements,
} from '../../../modules/productCatalog/productCatalogImportAccess.service.js';
import {
    PRODUCT_CATALOG_FEATURE,
} from '../../../modules/productCatalog/productCatalogCapability.registry.js';
import {
    PRODUCT_CATALOG_PERMISSION,
} from '../../../modules/productCatalog/productCatalogPermission.registry.js';
import {
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_IMPORT_STATUS,
} from '../../../modules/productCatalog/productCatalog.registry.js';
import {
    ProductImportSession,
} from '../../../modules/productCatalog/productImportSession.model.js';

describe('M-002 import commit access requirements', () => {
    it('résout une session Workspace PREVIEWED avec sanitizeFilter activé', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();

        const importSession = await ProductImportSession.create({
            scope: PRODUCT_IMPORT_SCOPE.WORKSPACE,
            workspace: workspaceId,
            actor: actorId,
            status: PRODUCT_IMPORT_STATUS.PREVIEWED,
            format: 'CSV',
            headers: ['Produit'],
            rows: [['Carotte']],
            preview: [{
                rowNumber: 2,
                classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT,
            }],
            expiresAt: new Date(Date.now() + 60_000),
        });

        await expect(
            resolveProductImportCommitRequirements({
                workspaceId,
                actorId,
                importId: importSession._id,
                decisions: [],
            }),
        ).resolves.toEqual({
            permissions: [PRODUCT_CATALOG_PERMISSION.CONTRIBUTE],
            features: [PRODUCT_CATALOG_FEATURE.CONTRIBUTION],
        });
    });

    it('n exige que la gestion du catalogue pour un rattachement existant', () => {
        expect(
            collectProductImportCommitRequirements({
                preview: [{
                    rowNumber: 2,
                    classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.ATTACH_EXISTING,
                }],
            }),
        ).toEqual({
            permissions: [PRODUCT_CATALOG_PERMISSION.CATALOG_MANAGE],
            features: [],
        });
    });

    it('n exige que la création pour une nouvelle référence', () => {
        expect(
            collectProductImportCommitRequirements({
                preview: [{
                    rowNumber: 2,
                    classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT,
                }],
            }),
        ).toEqual({
            permissions: [PRODUCT_CATALOG_PERMISSION.CONTRIBUTE],
            features: [PRODUCT_CATALOG_FEATURE.CONTRIBUTION],
        });
    });

    it('respecte la décision explicite sur une ligne ambiguë', () => {
        const preview = [{
            rowNumber: 2,
            classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.REVIEW_REQUIRED,
        }];

        expect(
            collectProductImportCommitRequirements({
                preview,
                decisions: [{
                    rowNumber: 2,
                    action: 'ATTACH_EXISTING',
                    variantId: '507f1f77bcf86cd799439011',
                }],
            }),
        ).toEqual({
            permissions: [PRODUCT_CATALOG_PERMISSION.CATALOG_MANAGE],
            features: [],
        });

        expect(
            collectProductImportCommitRequirements({
                preview,
                decisions: [{
                    rowNumber: 2,
                    action: 'CREATE_NEW',
                }],
            }),
        ).toEqual({
            permissions: [PRODUCT_CATALOG_PERMISSION.CONTRIBUTE],
            features: [PRODUCT_CATALOG_FEATURE.CONTRIBUTION],
        });
    });

    it('ne réclame aucun droit de mutation pour une ligne ignorée', () => {
        expect(
            collectProductImportCommitRequirements({
                preview: [{
                    rowNumber: 2,
                    classification: PRODUCT_IMPORT_ROW_CLASSIFICATION.CREATE_PRODUCT,
                }],
                decisions: [{
                    rowNumber: 2,
                    action: 'SKIP',
                }],
            }),
        ).toEqual({
            permissions: [],
            features: [],
        });
    });
});
