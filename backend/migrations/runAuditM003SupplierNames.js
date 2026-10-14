import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { auditM003SupplierNames } from './auditM003SupplierNames.migration.js';

try {
    await connectDB(env.MONGODB_URI);
    const result = await auditM003SupplierNames();
    console.log(JSON.stringify(result, null, 2));
    if (!result.safeForUniqueIndexes) process.exitCode = 1;
} catch (error) {
    console.error('Audit des Fournisseurs impossible :', error.message);
    process.exitCode = 1;
} finally {
    await mongoose.connection.close();
}
