import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import {
    CanonicalProduct,
} from '../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCategory,
} from '../../modules/productCatalog/productCategory.model.js';
import {
    ProductCharacteristic,
} from '../../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductImportSession,
} from '../../modules/productCatalog/productImportSession.model.js';
import {
    ProductReferenceBootstrapRun,
} from '../../modules/productCatalog/productReferenceBootstrapRun.model.js';
import {
    ProductReferenceEvent,
} from '../../modules/productCatalog/productReferenceEvent.model.js';
import {
    ProductVariant,
} from '../../modules/productCatalog/productVariant.model.js';
import {
    ProductVariety,
} from '../../modules/productCatalog/productVariety.model.js';
import {
    ReferenceContribution,
} from '../../modules/productCatalog/referenceContribution.model.js';
import {
    WorkspaceProduct,
} from '../../modules/productCatalog/workspaceProduct.model.js';

const LOCAL_MONGO_HOSTS = new Set(['127.0.0.1', 'localhost']);

const parseMongoTarget = (mongodbUri) => {
    let parsed;
    try {
        parsed = new URL(mongodbUri);
    } catch {
        throw new Error(
            'Le reset M-002 exige une URI MongoDB locale valide.',
        );
    }

    return {
        host: parsed.hostname,
        databaseName: decodeURIComponent(
            parsed.pathname.replace(/^\//, ''),
        ),
    };
};

/**
 * Ce reset n'est jamais une primitive métier ni une migration de production.
 * Il sert uniquement à remettre à zéro le référentiel M-002 d'une base locale
 * de développement pendant la phase pré-release du module.
 */
const assertM002DevelopmentResetAllowed = ({
    nodeEnv = env.NODE_ENV,
    resetEnabled = env.ALLOW_DEVELOPMENT_DATA_RESET,
    mongodbUri = env.MONGODB_URI,
    confirmed = false,
} = {}) => {
    if (nodeEnv !== 'development') {
        throw new Error(
            'Le reset M-002 est autorisé uniquement avec NODE_ENV=development.',
        );
    }

    if (resetEnabled !== true) {
        throw new Error(
            'Activez ALLOW_DEVELOPMENT_DATA_RESET=true avant le reset M-002.',
        );
    }

    if (confirmed !== true) {
        throw new Error(
            'Le reset M-002 exige --confirm-m002-reset.',
        );
    }

    const { host, databaseName } = parseMongoTarget(mongodbUri);

    if (!LOCAL_MONGO_HOSTS.has(host)) {
        throw new Error(
            'Le reset M-002 refuse toute base MongoDB non locale.',
        );
    }

    if (!databaseName.endsWith('-dev')) {
        throw new Error(
            'Le reset M-002 exige une base MongoDB locale se terminant par -dev.',
        );
    }
};

const M002_COLLECTIONS = Object.freeze([
    ['productImportSessions', ProductImportSession],
    ['productReferenceEvents', ProductReferenceEvent],
    ['referenceContributions', ReferenceContribution],
    ['workspaceProducts', WorkspaceProduct],
    ['productVariants', ProductVariant],
    ['productCharacteristics', ProductCharacteristic],
    ['productVarieties', ProductVariety],
    ['canonicalProducts', CanonicalProduct],
    ['productCategories', ProductCategory],
    ['productReferenceBootstrapRuns', ProductReferenceBootstrapRun],
]);

const clearM002CatalogCollections = async ({ session }) => {
    const deleted = {};

    for (const [key, Model] of M002_COLLECTIONS) {
        const result = await Model.collection.deleteMany(
            {},
            { session },
        );
        deleted[key] = result.deletedCount;
    }

    return deleted;
};

const resetM002CatalogDevelopment = async ({
    confirmed,
    nodeEnv = env.NODE_ENV,
    resetEnabled = env.ALLOW_DEVELOPMENT_DATA_RESET,
    mongodbUri = env.MONGODB_URI,
}) => {
    assertM002DevelopmentResetAllowed({
        nodeEnv,
        resetEnabled,
        mongodbUri,
        confirmed,
    });

    let deleted;

    await mongoose.connection.transaction(async (session) => {
        deleted = await clearM002CatalogCollections({ session });
    });

    return {
        databaseName: mongoose.connection.name,
        deleted,
    };
};

export {
    M002_COLLECTIONS,
    assertM002DevelopmentResetAllowed,
    clearM002CatalogCollections,
    parseMongoTarget,
    resetM002CatalogDevelopment,
};
