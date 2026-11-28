/**
 * PRE-BETA-003 : diagnostic MongoDB strictement en lecture seule.
 * Ne crée aucun modèle, collection, index, document ou transaction validée.
 * Les secrets restent exclusivement dans MONGODB_URI fourni par l'environnement.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LOCAL_DATABASE = 'saas_fiches_techniques_gms_dev';
const UNSAFE_REMOTE_DATABASE = /(?:^|[_-])(?:dev|test|e2e)(?:$|[_-])/i;

/**
 * Refuse une cible incohérente avant toute ouverture de connexion.
 * @returns {{target: string, database: string}}
 */
export function inspectMongoTarget({ target, expectedDatabase, uri }) {
    if (!['local', 'atlas'].includes(target)) {
        throw new Error('Cible MongoDB inconnue : local ou atlas exigé.');
    }
    if (!expectedDatabase || typeof expectedDatabase !== 'string') {
        throw new Error('Nom de base attendu explicite obligatoire.');
    }
    if (typeof uri !== 'string' || !uri.trim()) {
        throw new Error('MONGODB_URI absente.');
    }

    let parsed;
    try {
        parsed = new URL(uri);
    } catch {
        throw new Error('URI MongoDB invalide.');
    }

    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!database || database !== expectedDatabase) {
        throw new Error('Le nom de base ne correspond pas à la cible déclarée.');
    }

    if (target === 'local') {
        if (parsed.protocol !== 'mongodb:'
            || parsed.hostname !== '127.0.0.1'
            || parsed.port !== '27017'
            || parsed.searchParams.get('replicaSet') !== 'rs0'
            || database !== LOCAL_DATABASE) {
            throw new Error('La cible locale doit utiliser rs0 et la base de développement GMS.');
        }
    } else if (parsed.protocol !== 'mongodb+srv:'
        || !parsed.hostname.endsWith('.mongodb.net')
        || !parsed.username || !parsed.password
        || UNSAFE_REMOTE_DATABASE.test(database)
        || parsed.searchParams.get('tls') === 'false'
        || parsed.searchParams.get('ssl') === 'false') {
        throw new Error('La cible Atlas exige un URI SRV authentifié et une base hors dev/tests.');
    }

    return Object.freeze({ target, database });
}

/**
 * Vérifie le ping, la topologie et une lecture dans une transaction avortée.
 * Un succès ne prouve ni les droits d'écriture, ni les index, ni les seeds.
 */
export async function verifyMongoReadOnly({ target, expectedDatabase, uri, connectionFactory }) {
    const inspected = inspectMongoTarget({ target, expectedDatabase, uri });
    const connect = connectionFactory || (async (mongoUri, options) => {
        const mongoose = (await import('mongoose')).default;
        return mongoose.createConnection(mongoUri, options).asPromise();
    });

    const connection = await connect(uri, {
        autoIndex: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 8000,
    });
    try {
        if (connection.db.databaseName !== inspected.database) {
            throw new Error('Base connectée différente de la base déclarée.');
        }
        await connection.db.admin().command({ ping: 1 });
        const hello = await connection.db.admin().command({ hello: 1 });
        if (target === 'local' && hello.setName !== 'rs0') {
            throw new Error('Le serveur local ne confirme pas le replica set rs0.');
        }
        if (target === 'atlas' && !hello.setName && hello.msg !== 'isdbgrid') {
            throw new Error('La topologie Atlas ne confirme pas un déploiement transactionnel.');
        }

        const session = await connection.startSession();
        try {
            session.startTransaction({ readConcern: { level: 'snapshot' } });
            await connection.db.collection('plans').findOne({}, {
                session,
                projection: { _id: 1 },
            });
        } finally {
            try {
                if (session.inTransaction()) await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }
        return inspected;
    } finally {
        await connection.close();
    }
}

const direct = process.argv[1]
    && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
    try {
        const result = await verifyMongoReadOnly({
            target: process.env.DB_VERIFY_TARGET,
            expectedDatabase: process.env.DB_VERIFY_EXPECTED_NAME,
            uri: process.env.MONGODB_URI,
        });
        console.log('MongoDB ' + result.target + ' : ping, topologie et lecture transactionnelle OK (' + result.database + ').');
        console.log('Lecture seule : aucun index, seed, droit d’écriture ou déploiement applicatif validé.');
    } catch {
        // Les messages d'erreur du driver peuvent contenir des informations sensibles.
        console.error('MongoDB : contrôle refusé ou échoué. Vérifier localement cible, réseau, droits et URI (sans partager de secret).');
        process.exitCode = 1;
    }
}
