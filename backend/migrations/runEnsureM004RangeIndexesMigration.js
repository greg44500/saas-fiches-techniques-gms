import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { backfillRegisteredSystemRolePermissions } from './backfillRegisteredSystemRolePermissions.migration.js';
import { ensureM004RangeIndexes } from './ensureM004RangeIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const indexes = await ensureM004RangeIndexes();
        const permissions = await backfillRegisteredSystemRolePermissions();
        console.log('Migration M-004 Gammes terminée :', { indexes, permissions });
    } catch (error) {
        console.error('Échec de la migration M-004 Gammes :', { message: error.message });
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
