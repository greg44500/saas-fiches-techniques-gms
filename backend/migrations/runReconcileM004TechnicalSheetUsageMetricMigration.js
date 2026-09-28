import mongoose from 'mongoose';

import '../config/applicationCapability.registry.js';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    reconcileM004TechnicalSheetUsageMetric,
} from './reconcileM004TechnicalSheetUsageMetric.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await reconcileM004TechnicalSheetUsageMetric();

        console.log(
            'Réconciliation M-004 UsageMetric terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la réconciliation M-004 UsageMetric :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
