import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';
import {
    ensureM003SupplierCatalogIndexes,
} from './ensureM003SupplierCatalogIndexes.migration.js';
import {
    loadDefaultGlobalIndicativePriceDataset,
    seedM003GlobalIndicativePrices,
} from '../seeds/seedM003GlobalIndicativePrices.js';
import {
    resolveBootstrapActorId,
} from '../seeds/seedM002Reference.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const indexes =
            await ensureM003SupplierCatalogIndexes();
        const permissions =
            await backfillRegisteredSystemRolePermissions();
        const [dataset, actorId] = await Promise.all([
            loadDefaultGlobalIndicativePriceDataset(),
            resolveBootstrapActorId(),
        ]);
        const globalIndicativePrices =
            await seedM003GlobalIndicativePrices({
                dataset,
                actorId,
            });

        console.log(
            'Migration M-003 Prix indicatifs terminée :',
            {
                indexes,
                permissions,
                globalIndicativePrices,
            },
        );
    } catch (error) {
        console.error(
            'Échec de la migration M-003 Prix indicatifs :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
