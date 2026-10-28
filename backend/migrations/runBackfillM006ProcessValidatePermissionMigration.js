import mongoose from 'mongoose';

import '../config/applicationRolePermission.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    backfillRegisteredSystemRolePermissions,
} from './backfillRegisteredSystemRolePermissions.migration.js';

// Idempotent migration: backfill only registered system roles (Owner).
// Never grant VALIDATE implicitly to custom contributor roles.
const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        const result = await backfillRegisteredSystemRolePermissions();
        console.log('Permission validation M-006 réconciliée :', result);
    } catch (error) {
        console.error('Échec migration validation process M-006 :', error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
