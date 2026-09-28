import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
    purgeExpiredTechnicalSheets,
} from '../../modules/technicalSheet/technicalSheetLifecycle.service.js';

const runPurgeDeletedTechnicalSheetsJob =
    async ({
        now = new Date(),
        batchSize = 100,
    } = {}) => purgeExpiredTechnicalSheets({
        now,
        batchSize,
    });

const run = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const result =
            await runPurgeDeletedTechnicalSheetsJob();

        console.log(
            'Purge des Fiches techniques supprimées terminée :',
            result,
        );
    } finally {
        await mongoose.disconnect();
    }
};

const isExecutedDirectly =
    process.argv[1]
    && import.meta.url
        === pathToFileURL(
            process.argv[1],
        ).href;

if (isExecutedDirectly) {
    run().catch((error) => {
        console.error(
            'Échec de la purge des Fiches techniques :',
            { message: error.message },
        );
        process.exitCode = 1;
    });
}

export {
    runPurgeDeletedTechnicalSheetsJob,
};
