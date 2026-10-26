import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';
import {
    ensureM006ProcessLibraryIndexes,
} from './ensureM006ProcessLibraryIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const indexes = await ensureM006ProcessLibraryIndexes();
        const permissions = await backfillRegisteredSystemRolePermissions();
        console.log('Migration M-006 bibliothèque terminée :', {
            indexes, permissions,
        });
    } catch (error) {
        console.error('Échec migration M-006 bibliothèque :', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
