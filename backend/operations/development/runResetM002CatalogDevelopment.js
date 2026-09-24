import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import {
    resetM002CatalogDevelopment,
} from './resetM002CatalogDevelopment.service.js';

const hasFlag = (name) => process.argv.includes(`--${name}`);

const run = async () => {
    const confirmed = hasFlag('confirm-m002-reset');

    await connectDB(env.MONGODB_URI);

    const result = await resetM002CatalogDevelopment({
        confirmed,
    });

    console.info(
        'Référentiel M-002 de développement réinitialisé.',
        result,
    );
};

run()
    .catch((error) => {
        console.error(
            'Échec du reset M-002 de développement :',
            { message: error?.message ?? 'Erreur inconnue' },
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
