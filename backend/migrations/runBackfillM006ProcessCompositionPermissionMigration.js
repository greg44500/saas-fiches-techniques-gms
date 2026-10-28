import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';

/**
 * Independent migration: the library-permissions migration may already have
 * run before process-sheet:read was introduced. Safe to rerun.
 */
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const result = await backfillRegisteredSystemRolePermissions();
        console.log('Permission M-006 composition réconciliée :', result);
    } catch (error) {
        console.error('Échec de migration permission M-006 :', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
