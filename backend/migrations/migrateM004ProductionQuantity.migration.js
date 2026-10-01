import {
    TechnicalSheetDraft,
} from '../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from '../modules/technicalSheet/technicalSheetValidation.model.js';

const migrateM004ProductionQuantity = async () => {
    const draftBackfill =
        await TechnicalSheetDraft.collection.updateMany(
            {
                portions: { $exists: true },
                $or: [
                    { productionQuantity: { $exists: false } },
                    { productionQuantity: null },
                ],
            },
            [
                {
                    $set: {
                        productionQuantity: '$portions',
                    },
                },
            ],
        );

    const validationBackfill =
        await TechnicalSheetValidation.collection.updateMany(
            {
                'sheetSnapshot.portions': {
                    $exists: true,
                },
                $or: [
                    {
                        'sheetSnapshot.productionQuantity': {
                            $exists: false,
                        },
                    },
                    {
                        'sheetSnapshot.productionQuantity':
                            null,
                    },
                ],
            },
            [
                {
                    $set: {
                        'sheetSnapshot.productionQuantity':
                            '$sheetSnapshot.portions',
                    },
                },
            ],
        );

    const draftCleanup =
        await TechnicalSheetDraft.collection.updateMany(
            {
                portions: { $exists: true },
            },
            {
                $unset: {
                    portions: '',
                },
            },
        );

    const validationCleanup =
        await TechnicalSheetValidation.collection.updateMany(
            {
                'sheetSnapshot.portions': {
                    $exists: true,
                },
            },
            {
                $unset: {
                    'sheetSnapshot.portions': '',
                },
            },
        );

    return {
        draftBackfill: {
            matchedCount:
                draftBackfill.matchedCount,
            modifiedCount:
                draftBackfill.modifiedCount,
        },
        validationBackfill: {
            matchedCount:
                validationBackfill.matchedCount,
            modifiedCount:
                validationBackfill.modifiedCount,
        },
        draftCleanup: {
            matchedCount:
                draftCleanup.matchedCount,
            modifiedCount:
                draftCleanup.modifiedCount,
        },
        validationCleanup: {
            matchedCount:
                validationCleanup.matchedCount,
            modifiedCount:
                validationCleanup.modifiedCount,
        },
    };
};

export {
    migrateM004ProductionQuantity,
};
