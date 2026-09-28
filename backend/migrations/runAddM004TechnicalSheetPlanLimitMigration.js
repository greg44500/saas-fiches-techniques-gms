import mongoose from 'mongoose';

import '../config/applicationCapability.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    addM004TechnicalSheetPlanLimit,
} from './addM004TechnicalSheetPlanLimit.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await addM004TechnicalSheetPlanLimit();

        console.log(
            'Migration M-004 limite de Plans terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration M-004 limite de Plans :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
