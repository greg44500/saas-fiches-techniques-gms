import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Workspace } from '../modules/workspace/workspace.model.js';
import {
    ensureWorkspaceProcessPhases,
} from '../modules/process/processPhaseTitles.service.js';
import {
    ensureM006ProcessLibraryIndexes,
} from './ensureM006ProcessLibraryIndexes.migration.js';

const run = async () => {
    try {
        await connectDB(env.MONGODB_URI);
        await ensureM006ProcessLibraryIndexes();
        let count = 0;
        for await (const workspace of Workspace.find().select('_id').cursor()) {
            await ensureWorkspaceProcessPhases({ workspaceId: workspace._id });
            count += 1;
        }
        console.log('Phases initiales M-006 assurées pour', count, 'Workspaces.');
    } catch (error) {
        console.error('Échec seed M-006 :', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

run();
