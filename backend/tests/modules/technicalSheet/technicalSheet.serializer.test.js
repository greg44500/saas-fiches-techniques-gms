import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    serializeTechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheet.serializer.js';

describe('M-004 technical sheet serializer', () => {
    it('présente une ancienne ligne dans l’unité de référence du Produit sans réécrire l’historique', () => {
        const draft = {
            _id:
                new mongoose.Types.ObjectId(),
            technicalSheet:
                new mongoose.Types.ObjectId(),
            revision: 3,
            productionQuantity:
                mongoose.Types.Decimal128
                    .fromString('1'),
            productionUnit: 'KG',
            vatRateBasisPoints: 1000,
            targetMarginBasisPoints: 3000,
            finalPriceTtcMinor: null,
            finalPriceMode: 'ADVISED',
            valuationStatus: 'STALE',
            valuedAt: null,
            valuationFingerprint: null,
            economicSnapshot: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lines: [{
                _id:
                    new mongoose.Types.ObjectId(),
                kind: 'INGREDIENT',
                productVariant: {
                    _id:
                        new mongoose.Types.ObjectId(),
                    name: 'Farine',
                    referenceUnit: 'KG',
                    yieldPercent: 100,
                    status: 'ACTIVE',
                },
                netQuantity:
                    mongoose.Types.Decimal128
                        .fromString('1000'),
                inputUnit: 'G',
                order: 0,
                note: null,
                selectedSupplierArticle: null,
                calculation: {
                    yieldPercentUsed:
                        mongoose.Types.Decimal128
                            .fromString('100'),
                    grossQuantity:
                        mongoose.Types.Decimal128
                            .fromString('1000'),
                    grossUnit: 'G',
                },
                valuation: {
                    status: 'STALE',
                    supplierArticleId: null,
                    applicableSource: null,
                    applicableSourceId: null,
                    normalizedAmount: null,
                    normalizedUnit: null,
                    lineCostHt: null,
                    materialCostSharePercent: null,
                    pricedAt: null,
                    alerts: [],
                },
            }],
        };

        const serialized =
            serializeTechnicalSheetDraft(draft);

        expect(
            serialized,
        ).toMatchObject({
            productionUnit: 'KG',
            portionsPerProductionUnit: null,
            totalPortions: null,
            saleBasis: null,
        });

        expect(
            serialized.lines[0],
        ).toMatchObject({
            netQuantity: '1',
            inputUnit: 'KG',
            calculation: {
                grossQuantity: '1',
                grossUnit: 'KG',
            },
        });
    });
});
