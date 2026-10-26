import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';
import { ensureM006ProcessSheetIndexes } from './ensureM006ProcessSheetIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const indexes = await ensureM006ProcessSheetIndexes();
        const permissions = await backfillRegisteredSystemRolePermissions();
        console.log('M-006 Fiches process :', { indexes, permissions });
    } catch (error) {
        console.error('Migration M-006 Fiches process échouée :', error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
