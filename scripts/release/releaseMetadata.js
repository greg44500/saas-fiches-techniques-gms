const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const RELEASE_CHANNEL = Object.freeze({
    DEVELOPMENT: 'development',
    RC: 'rc',
    STABLE: 'stable',
});

const parseSemver = (version) => {
    const match = SEMVER_PATTERN.exec(version);

    if (!match) {
        return null;
    }

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] ?? null,
    };
};

const collectReleaseIdentityErrors = ({
    release,
    rootPackage,
    rootLock,
    frontendPackage,
    frontendLock,
}) => {
    const errors = [];

    if (release?.schemaVersion !== 1) {
        errors.push('core-release.json doit utiliser schemaVersion = 1.');
    }

    if (release?.name !== rootPackage?.name) {
        errors.push('Le nom Core doit correspondre au package racine.');
    }

    if (!release?.repository) {
        errors.push('core-release.json doit déclarer repository.');
    }

    const version = release?.version;
    const parsedVersion = parseSemver(version ?? '');

    if (!parsedVersion) {
        errors.push('La version Core doit respecter SemVer.');
    }

    const declaredVersions = [
        ['package.json', rootPackage?.version],
        ['package-lock.json', rootLock?.version],
        ['package-lock.json packages[""]', rootLock?.packages?.['']?.version],
        ['frontend/package.json', frontendPackage?.version],
        ['frontend/package-lock.json', frontendLock?.version],
        [
            'frontend/package-lock.json packages[""]',
            frontendLock?.packages?.['']?.version,
        ],
    ];

    for (const [source, declaredVersion] of declaredVersions) {
        if (declaredVersion !== version) {
            errors.push(
                `${source} déclare ${declaredVersion ?? 'aucune version'} au lieu de ${version ?? 'aucune version'}.`,
            );
        }
    }

    if (parsedVersion) {
        if (release.channel === RELEASE_CHANNEL.DEVELOPMENT) {
            if (parsedVersion.major !== 0 || parsedVersion.prerelease !== null) {
                errors.push(
                    'Le canal development doit rester sur une version 0.x.y sans prerelease.',
                );
            }
        } else if (release.channel === RELEASE_CHANNEL.RC) {
            if (!/^rc\.[1-9]\d*$/.test(parsedVersion.prerelease ?? '')) {
                errors.push(
                    'Le canal rc exige un suffixe prerelease rc.N avec N >= 1.',
                );
            }
        } else if (release.channel === RELEASE_CHANNEL.STABLE) {
            if (parsedVersion.major < 1 || parsedVersion.prerelease !== null) {
                errors.push(
                    'Le canal stable exige une version >= 1.0.0 sans prerelease.',
                );
            }
        } else {
            errors.push(
                `Canal de release inconnu : ${release?.channel ?? 'absent'}.`,
            );
        }
    }

    return errors;
};

const collectDerivedProductReleaseErrors = ({
    coreOriginExists,
    productRelease,
}) => {
    const errors = [];
    const productReleaseExists = Boolean(productRelease);

    if (!coreOriginExists && !productReleaseExists) {
        return errors;
    }

    if (coreOriginExists && !productReleaseExists) {
        errors.push(
            'Un SaaS dérivé avec core-origin.json doit déclarer product-release.json.',
        );
        return errors;
    }

    if (!coreOriginExists && productReleaseExists) {
        errors.push(
            'product-release.json est réservé à un SaaS dérivé déclarant core-origin.json.',
        );
        return errors;
    }

    if (productRelease.schemaVersion !== 1) {
        errors.push('product-release.json doit utiliser schemaVersion = 1.');
    }

    if (!productRelease.name?.trim()) {
        errors.push('product-release.json doit déclarer name.');
    }

    if (!productRelease.repository?.trim()) {
        errors.push('product-release.json doit déclarer repository.');
    }

    const version = productRelease.version;
    const parsedVersion = parseSemver(version ?? '');

    if (!parsedVersion) {
        errors.push('La version produit doit respecter SemVer.');
        return errors;
    }

    if (productRelease.channel === RELEASE_CHANNEL.DEVELOPMENT) {
        if (parsedVersion.major !== 0 || parsedVersion.prerelease !== null) {
            errors.push(
                'Le canal development produit doit utiliser une version 0.x.y sans prerelease.',
            );
        }
    } else if (productRelease.channel === RELEASE_CHANNEL.RC) {
        if (!/^rc\.[1-9]\d*$/.test(parsedVersion.prerelease ?? '')) {
            errors.push(
                'Le canal rc produit exige un suffixe prerelease rc.N avec N >= 1.',
            );
        }
    } else if (productRelease.channel === RELEASE_CHANNEL.STABLE) {
        if (parsedVersion.major < 1 || parsedVersion.prerelease !== null) {
            errors.push(
                'Le canal stable produit exige une version >= 1.0.0 sans prerelease.',
            );
        }
    } else {
        errors.push(
            `Canal de release produit inconnu : ${productRelease.channel ?? 'absent'}.`,
        );
    }

    return errors;
};

const detectDependencyCycle = (migrationsById) => {
    const visiting = new Set();
    const visited = new Set();

    const visit = (migrationId) => {
        if (visiting.has(migrationId)) {
            return true;
        }

        if (visited.has(migrationId)) {
            return false;
        }

        visiting.add(migrationId);

        const migration = migrationsById.get(migrationId);

        for (const dependencyId of migration?.dependsOn ?? []) {
            if (visit(dependencyId)) {
                return true;
            }
        }

        visiting.delete(migrationId);
        visited.add(migrationId);
        return false;
    };

    for (const migrationId of migrationsById.keys()) {
        if (visit(migrationId)) {
            return true;
        }
    }

    return false;
};

const collectMigrationManifestErrors = ({
    manifest,
    packageScripts,
    runnerPaths,
}) => {
    const errors = [];

    if (manifest?.schemaVersion !== 1) {
        errors.push('migration-manifest.json doit utiliser schemaVersion = 1.');
    }

    const migrations = Array.isArray(manifest?.migrations)
        ? manifest.migrations
        : [];

    if (!Array.isArray(manifest?.migrations)) {
        errors.push('migration-manifest.json doit contenir un tableau migrations.');
    }

    const ids = new Set();
    const scripts = new Set();
    const runners = new Set();

    for (const migration of migrations) {
        if (!migration?.id || ids.has(migration.id)) {
            errors.push(
                `Identifiant de migration absent ou dupliqué : ${migration?.id ?? 'absent'}.`,
            );
        } else {
            ids.add(migration.id);
        }

        if (!migration?.script || scripts.has(migration.script)) {
            errors.push(
                `Script de migration absent ou dupliqué : ${migration?.script ?? 'absent'}.`,
            );
        } else {
            scripts.add(migration.script);
        }

        if (!migration?.runner || runners.has(migration.runner)) {
            errors.push(
                `Runner de migration absent ou dupliqué : ${migration?.runner ?? 'absent'}.`,
            );
        } else {
            runners.add(migration.runner);
        }

        if (!Array.isArray(migration?.dependsOn)) {
            errors.push(
                `dependsOn doit être un tableau pour ${migration?.id ?? 'migration inconnue'}.`,
            );
        }
    }

    const packageMigrationScripts = new Set(
        Object.keys(packageScripts ?? {}).filter((scriptName) => (
            scriptName.startsWith('migration:')
        )),
    );

    for (const scriptName of packageMigrationScripts) {
        if (!scripts.has(scriptName)) {
            errors.push(
                `Le script package.json ${scriptName} est absent du manifeste.`,
            );
        }
    }

    for (const scriptName of scripts) {
        if (!packageMigrationScripts.has(scriptName)) {
            errors.push(
                `Le manifeste référence ${scriptName}, absent de package.json.`,
            );
        }
    }

    const actualRunnerPaths = new Set(runnerPaths ?? []);

    for (const runnerPath of actualRunnerPaths) {
        if (!runners.has(runnerPath)) {
            errors.push(
                `Le runner ${runnerPath} n'est pas inventorié dans le manifeste.`,
            );
        }
    }

    for (const runnerPath of runners) {
        if (!actualRunnerPaths.has(runnerPath)) {
            errors.push(
                `Le manifeste référence le runner introuvable ${runnerPath}.`,
            );
        }
    }

    const migrationsById = new Map(
        migrations
            .filter((migration) => migration?.id)
            .map((migration) => [migration.id, migration]),
    );

    for (const migration of migrations) {
        if (!Array.isArray(migration?.dependsOn)) {
            continue;
        }

        for (const dependencyId of migration.dependsOn) {
            if (!migrationsById.has(dependencyId)) {
                errors.push(
                    `${migration.id} dépend d'une migration inconnue : ${dependencyId}.`,
                );
            }

            if (dependencyId === migration.id) {
                errors.push(`${migration.id} ne peut pas dépendre d'elle-même.`);
            }
        }
    }

    if (detectDependencyCycle(migrationsById)) {
        errors.push('Le manifeste de migrations contient un cycle de dépendances.');
    }

    return errors;
};

export {
    RELEASE_CHANNEL,
    collectDerivedProductReleaseErrors,
    collectMigrationManifestErrors,
    collectReleaseIdentityErrors,
    parseSemver,
};
