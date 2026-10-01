import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
    migrateM004ProductionQuantity,
} from './migrateM004ProductionQuantity.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const result =
            await migrateM004ProductionQuantity();

        console.log(
            'Migration M-004 quantité produite terminée :',
            result,
        );
    } catch (error) {
        console.error(
            'Échec de la migration M-004 quantité produite :',
            { message: error.message },
        );
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
