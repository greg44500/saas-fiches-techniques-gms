import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    migrateApplicationGlobalAuthorizationIndexes,
} from './addApplicationGlobalAuthorizationIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateApplicationGlobalAuthorizationIndexes();

        console.log(
            'Migration addApplicationGlobalAuthorizationIndexes terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration addApplicationGlobalAuthorizationIndexes :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
