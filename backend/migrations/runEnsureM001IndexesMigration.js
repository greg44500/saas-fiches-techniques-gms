import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    ensureM001Indexes,
} from './ensureM001Indexes.migration.js';


const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result = await ensureM001Indexes();

        console.log(
            'Migration ensureM001Indexes terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration ensureM001Indexes :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
