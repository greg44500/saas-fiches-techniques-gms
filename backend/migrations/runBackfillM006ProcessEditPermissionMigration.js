import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';

// Separate from the already-applied creation permission migration so
// existing Workspace Owners receive EDIT without re-running unrelated DDL.
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const result = await backfillRegisteredSystemRolePermissions();
        console.log('Permission édition M-006 réconciliée :', result);
    } catch (error) {
        console.error('Échec migration édition process M-006 :', error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};
run();
