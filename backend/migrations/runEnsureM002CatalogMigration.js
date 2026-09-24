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

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const lifecycle = await backfillM002LegacyProductLifecycle();
        const variantSemantics = await migrateM002VariantSemantics();
        const variantCharacteristics = await migrateM002VariantCharacteristics();
        const foodRangeUsageType = await migrateM002FoodRangeUsageType();
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
