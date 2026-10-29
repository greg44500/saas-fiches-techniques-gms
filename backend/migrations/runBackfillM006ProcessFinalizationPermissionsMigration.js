import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';

// Idempotent: only the system Owner receives the new permissions.
// Never grant them implicitly to custom Workspace roles.
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const result = await backfillRegisteredSystemRolePermissions();
        console.log('Permissions finalisation M-006 réconciliées :', result);
    } catch (error) {
        console.error('Échec migration permissions M-006 :', error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
