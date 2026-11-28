import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const repository = fileURLToPath(new URL('../../', import.meta.url));

export async function findModelFiles(directory) {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) found.push(...await findModelFiles(path));
        else if (entry.isFile() && entry.name.endsWith('.model.js')) found.push(path);
    }
    return found.sort();
}

/** Inventory Mongoose schemas, not a database. No create/sync/drop calls. */
export function describeModels(models) {
    return Object.values(models).sort((a, b) => a.modelName.localeCompare(b.modelName)).map((model) => ({
        model: model.modelName,
        collection: model.collection.name,
        indexes: model.schema.indexes().map(([key, options]) => ({
            key,
            options: Object.fromEntries(Object.entries(options)
                .filter(([name]) => name !== 'background')),
        })),
    }));
}

async function main() {
    // The standalone CLI owns a disposable environment. Never load real secrets.
    const template = parseEnv(await readFile(join(repository, '.env.example'), 'utf8'));
    const config = {
        ...template,
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/fichepilot_inventory_test?replicaSet=rs0',
        CLIENT_URL: 'http://127.0.0.1:5173',
        JWT_ACCESS_SECRET: 'inventory-only-jwt-0123456789abcdef',
        TRIAL_IDENTITY_SECRET: 'inventory-only-trial-0123456789abcdef',
        SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_SECURE: 'false',
        SMTP_USER: 'inventory', SMTP_PASSWORD: 'inventory',
        SMTP_FROM_EMAIL: 'no-reply@example.test', SMTP_FROM_NAME: 'Inventory',
        E2E_BYPASS_RATE_LIMITS: 'false', ALLOW_DEVELOPMENT_DATA_RESET: 'false',
        HTTP_TRUST_PROXY: 'none', HTTP_BIND_HOST: '127.0.0.1',
        DOTENV_CONFIG_PATH: join(repository, '.env.example'),
        DOTENV_CONFIG_OVERRIDE: 'false',
    };
    for (const [key, value] of Object.entries(config)) process.env[key] = value;
    // Explicitly disable schema auto-initialization before any model is imported.
    const { default: mongoose } = await import('mongoose');
    mongoose.set('autoCreate', false);
    mongoose.set('autoIndex', false);
    const candidates = await findModelFiles(join(repository, 'backend', 'modules'));
    if (!candidates.length) throw new Error('Aucun modèle détecté');
    for (const path of candidates) await import(pathToFileURL(path).href);
    if (mongoose.connection.readyState !== 0) throw new Error('Connexion inattendue');
    const models = describeModels(mongoose.models);
    if (!models.length) throw new Error('Aucun modèle enregistré');
    console.log(JSON.stringify({
        scope: 'backend/modules/**/*.model.js',
        modelFiles: candidates.length,
        modelCount: models.length,
        schemaIndexCount: models.reduce((sum, item) => sum + item.indexes.length, 0),
        models,
    }, null, 2));
}

const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
    try {
        await main();
    } catch {
        console.error('Inventaire des modèles impossible : vérifier les dépendances et les modèles.');
        process.exitCode = 1;
    }
}
