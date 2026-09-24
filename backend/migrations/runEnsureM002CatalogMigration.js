import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';
import {
    ensureM002CatalogIndexes,
} from './ensureM002CatalogIndexes.migration.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';
import {
    backfillM002LegacyProductLifecycle,
} from './backfillM002LegacyProductLifecycle.migration.js';
import {
    migrateM002VariantSemantics,
} from './migrateM002VariantSemantics.migration.js';
import {
    migrateM002VariantCharacteristics,
} from './migrateM002VariantCharacteristics.migration.js';
import {
    migrateM002FoodRangeUsageType,
} from './migrateM002FoodRangeUsageType.migration.js';
import {
    migrateM002ProductReferenceContract,
} from './migrateM002ProductReferenceContract.migration.js';
import {
    reconcileM002LegacyReferenceDuplicates,
} from './reconcileM002LegacyReferenceDuplicates.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const lifecycle = await backfillM002LegacyProductLifecycle();

        const hasLegacyVariantSemantics = Boolean(
            await ProductVariant.collection.findOne(
                {
                    $or: [
                        { form: { $exists: true } },
                        { normalizedForm: { $exists: true } },
                        { preservation: { $exists: true } },
                        { normalizedPreservation: { $exists: true } },
                    ],
                },
                { projection: { _id: 1 } },
            ),
        );
        const variantSemantics = hasLegacyVariantSemantics
            ? await migrateM002VariantSemantics()
            : { matchedCount: 0, modifiedCount: 0, skipped: true };

        const hasLegacyPresentation = Boolean(
            await ProductVariant.collection.findOne(
                {
                    $or: [
                        { presentation: { $exists: true } },
                        { normalizedPresentation: { $exists: true } },
                        { form: { $exists: true } },
                        { normalizedForm: { $exists: true } },
                    ],
                },
                { projection: { _id: 1 } },
            ),
        );
        const variantCharacteristics = hasLegacyPresentation
            ? await migrateM002VariantCharacteristics()
            : {
                matchedCount: 0,
                modifiedCount: 0,
                createdCharacteristics: 0,
                skipped: true,
            };

        const hasLegacyUsageType = Boolean(
            await ProductVariant.collection.findOne(
                {
                    $or: [
                        { usageType: { $exists: true } },
                        {
                            foodRange: 6,
                            $or: [
                                { name: { $exists: false } },
                                { name: null },
                                { name: '' },
                                { conservationType: { $exists: false } },
                                { conservationType: null },
                                { conservationType: '' },
                            ],
                        },
                    ],
                },
                { projection: { _id: 1 } },
            ),
        );
        const foodRangeUsageType = hasLegacyUsageType
            ? await migrateM002FoodRangeUsageType()
            : {
                matchedCount: 0,
                modifiedCount: 0,
                retiredLegacyRange6: 0,
                archivedWorkspaceFavorites: 0,
                skipped: true,
            };
        const legacyReferenceDuplicates =
            await reconcileM002LegacyReferenceDuplicates();
        const productReferenceContract = await migrateM002ProductReferenceContract();
        const indexes = await ensureM002CatalogIndexes();
        const permissions = await backfillRegisteredSystemRolePermissions();

        console.log(
            'Migration M-002 Catalogue Produits terminée :',
            {
                lifecycle,
                variantSemantics,
                variantCharacteristics,
                foodRangeUsageType,
                legacyReferenceDuplicates,
                productReferenceContract,
                indexes,
                permissions,
            },
        );
    } catch (error) {
        console.error(
            'Échec de la migration M-002 Catalogue Produits :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
