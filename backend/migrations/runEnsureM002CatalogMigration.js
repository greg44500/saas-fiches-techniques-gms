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

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const indexes = await ensureM002CatalogIndexes();
        const permissions = await backfillRegisteredSystemRolePermissions();

        console.log(
            'Migration M-002 Catalogue Produits terminée :',
            { indexes, permissions },
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
