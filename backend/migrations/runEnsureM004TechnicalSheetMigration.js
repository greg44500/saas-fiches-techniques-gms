import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';
import {
    ensureM004TechnicalSheetIndexes,
} from './ensureM004TechnicalSheetIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const indexes =
            await ensureM004TechnicalSheetIndexes();
        const permissions =
            await backfillRegisteredSystemRolePermissions();

        console.log(
            'Migration M-004 Fiches techniques terminée :',
            {
                indexes,
                permissions,
            },
        );
    } catch (error) {
        console.error(
            'Échec de la migration M-004 Fiches techniques :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
