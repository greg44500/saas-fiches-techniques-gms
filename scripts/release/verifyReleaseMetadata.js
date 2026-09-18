import {
    existsSync,
    readFileSync,
    readdirSync,
} from 'node:fs';
import path from 'node:path';

import {
    collectDerivedProductReleaseErrors,
    collectMigrationManifestErrors,
    collectReleaseIdentityErrors,
} from './releaseMetadata.js';

const repositoryRoot = process.cwd();

const readJson = (relativePath) => JSON.parse(
    readFileSync(path.join(repositoryRoot, relativePath), 'utf8'),
);

const getMigrationRunnerPaths = () => {
    const migrationDirectory = path.join(repositoryRoot, 'backend/migrations');

    return readdirSync(migrationDirectory)
        .filter((fileName) => (
            fileName.startsWith('run')
            && fileName.endsWith('Migration.js')
        ))
        .map((fileName) => `backend/migrations/${fileName}`)
        .sort();
};

const verifyReleaseMetadata = () => {
    const release = readJson('core-release.json');
    const rootPackage = readJson('package.json');
    const rootLock = readJson('package-lock.json');
    const frontendPackage = readJson('frontend/package.json');
    const frontendLock = readJson('frontend/package-lock.json');
    const migrationManifest = readJson(
        'docs/releases/migration-manifest.json',
    );
    const coreOriginExists = existsSync(
        path.join(repositoryRoot, 'core-origin.json'),
    );
    const productReleasePath = path.join(
        repositoryRoot,
        'product-release.json',
    );
    const productRelease = existsSync(productReleasePath)
        ? readJson('product-release.json')
        : null;

    const requiredFiles = [
        'CHANGELOG.md',
        'docs/releases/RELEASE-POLICY.md',
        'docs/releases/MIGRATION-POLICY.md',
    ];

    const errors = [
        ...collectReleaseIdentityErrors({
            release,
            rootPackage,
            rootLock,
            frontendPackage,
            frontendLock,
        }),
        ...collectDerivedProductReleaseErrors({
            coreOriginExists,
            productRelease,
        }),
        ...collectMigrationManifestErrors({
            manifest: migrationManifest,
            packageScripts: rootPackage.scripts,
            runnerPaths: getMigrationRunnerPaths(),
        }),
    ];

    for (const requiredFile of requiredFiles) {
        if (!existsSync(path.join(repositoryRoot, requiredFile))) {
            errors.push(`Fichier de release requis absent : ${requiredFile}.`);
        }
    }

    if (errors.length > 0) {
        console.error('Vérification de release échouée :');

        for (const error of errors) {
            console.error(`- ${error}`);
        }

        process.exitCode = 1;
        return;
    }

    console.log(
        `Release metadata OK — ${release.name} ${release.version} (${release.channel}).`,
    );
    console.log(
        `Migration manifest OK — ${migrationManifest.migrations.length} runners inventoriés.`,
    );
};

verifyReleaseMetadata();
