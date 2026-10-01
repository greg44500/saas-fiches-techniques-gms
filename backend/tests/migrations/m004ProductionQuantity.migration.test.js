import '../setup.js';

import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    migrateM004ProductionQuantity,
} from '../../migrations/migrateM004ProductionQuantity.migration.js';
import {
    TechnicalSheetDraft,
} from '../../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from '../../modules/technicalSheet/technicalSheetValidation.model.js';

describe('M-004 production quantity migration', () => {
    it('reprend les portions legacy puis supprime le champ obsolète de façon idempotente', async () => {
        const draftId =
            new mongoose.Types.ObjectId();
        const validationId =
            new mongoose.Types.ObjectId();
        const preservedDraftId =
            new mongoose.Types.ObjectId();

        await TechnicalSheetDraft.collection.insertOne({
            _id: draftId,
            productionQuantity: null,
            portions:
                mongoose.Types.Decimal128
                    .fromString('12'),
        });

        await TechnicalSheetDraft.collection.insertOne({
            _id: preservedDraftId,
            productionQuantity:
                mongoose.Types.Decimal128
                    .fromString('5'),
            portions:
                mongoose.Types.Decimal128
                    .fromString('99'),
        });

        await TechnicalSheetValidation.collection.insertOne({
            _id: validationId,
            sheetSnapshot: {
                productionQuantity: null,
                portions:
                    mongoose.Types.Decimal128
                        .fromString('8'),
            },
        });

        const first =
            await migrateM004ProductionQuantity();
        const second =
            await migrateM004ProductionQuantity();

        const draft =
            await TechnicalSheetDraft.collection
                .findOne({ _id: draftId });
        const validation =
            await TechnicalSheetValidation.collection
                .findOne({ _id: validationId });
        const preservedDraft =
            await TechnicalSheetDraft.collection
                .findOne({ _id: preservedDraftId });

        expect(
            draft.productionQuantity.toString(),
        ).toBe('12');
        expect(draft.portions).toBeUndefined();
        expect(
            preservedDraft.productionQuantity
                .toString(),
        ).toBe('5');
        expect(
            preservedDraft.portions,
        ).toBeUndefined();

        expect(
            validation.sheetSnapshot
                .productionQuantity.toString(),
        ).toBe('8');
        expect(
            validation.sheetSnapshot.portions,
        ).toBeUndefined();

        expect(
            first.draftBackfill.modifiedCount,
        ).toBe(1);
        expect(
            first.validationBackfill.modifiedCount,
        ).toBe(1);
        expect(
            second.draftBackfill.modifiedCount,
        ).toBe(0);
        expect(
            second.validationBackfill.modifiedCount,
        ).toBe(0);
    });
});
