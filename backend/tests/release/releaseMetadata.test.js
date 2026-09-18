import { describe, expect, it } from 'vitest';

import {
    collectDerivedProductReleaseErrors,
    collectMigrationManifestErrors,
    collectReleaseIdentityErrors,
    parseSemver,
} from '../../../scripts/release/releaseMetadata.js';

const createVersionSources = (version = '0.1.0') => ({
    release: {
        schemaVersion: 1,
        name: 'saas-core-api',
        repository: 'greg44500/saas-core-api',
        version,
        channel: 'development',
    },
    rootPackage: {
        name: 'saas-core-api',
        version,
    },
    rootLock: {
        version,
        packages: {
            '': { version },
        },
    },
    frontendPackage: { version },
    frontendLock: {
        version,
        packages: {
            '': { version },
        },
    },
});

describe('release metadata', () => {
    it('valide une identité development cohérente', () => {
        expect(
            collectReleaseIdentityErrors(createVersionSources()),
        ).toEqual([]);
    });

    it('refuse une divergence de version entre le Core et le frontend', () => {
        const sources = createVersionSources();
        sources.frontendPackage.version = '0.2.0';

        expect(
            collectReleaseIdentityErrors(sources),
        ).toContain(
            'frontend/package.json déclare 0.2.0 au lieu de 0.1.0.',
        );
    });

    it('valide le format SemVer des releases candidates', () => {
        const sources = createVersionSources('1.0.0-rc.2');
        sources.release.channel = 'rc';

        expect(parseSemver('1.0.0-rc.2')).toEqual({
            major: 1,
            minor: 0,
            patch: 0,
            prerelease: 'rc.2',
        });
        expect(collectReleaseIdentityErrors(sources)).toEqual([]);
    });

    it('refuse un canal stable sur une prerelease', () => {
        const sources = createVersionSources('1.0.0-rc.1');
        sources.release.channel = 'stable';

        expect(
            collectReleaseIdentityErrors(sources),
        ).toContain(
            'Le canal stable exige une version >= 1.0.0 sans prerelease.',
        );
    });
});

describe('derived product release metadata', () => {
    const createProductRelease = (version = '0.1.0') => ({
        schemaVersion: 1,
        name: 'saas-example-product',
        repository: 'example/saas-example-product',
        version,
        channel: 'development',
    });

    it('ne demande aucune identité produit dans le dépôt Core', () => {
        expect(
            collectDerivedProductReleaseErrors({
                coreOriginExists: false,
                productRelease: null,
            }),
        ).toEqual([]);
    });

    it('exige product-release.json dès qu’un core-origin.json est présent', () => {
        expect(
            collectDerivedProductReleaseErrors({
                coreOriginExists: true,
                productRelease: null,
            }),
        ).toContain(
            'Un SaaS dérivé avec core-origin.json doit déclarer product-release.json.',
        );
    });

    it('refuse product-release.json hors d’un SaaS dérivé', () => {
        expect(
            collectDerivedProductReleaseErrors({
                coreOriginExists: false,
                productRelease: createProductRelease(),
            }),
        ).toContain(
            'product-release.json est réservé à un SaaS dérivé déclarant core-origin.json.',
        );
    });

    it('valide une version produit indépendante de la version Core', () => {
        expect(
            collectDerivedProductReleaseErrors({
                coreOriginExists: true,
                productRelease: createProductRelease('0.3.0'),
            }),
        ).toEqual([]);
    });

    it('valide les canaux rc et stable du produit', () => {
        const rcRelease = createProductRelease('1.2.0-rc.2');
        rcRelease.channel = 'rc';

        const stableRelease = createProductRelease('1.2.0');
        stableRelease.channel = 'stable';

        expect(
            collectDerivedProductReleaseErrors({
                coreOriginExists: true,
                productRelease: rcRelease,
            }),
        ).toEqual([]);
        expect(
            collectDerivedProductReleaseErrors({
                coreOriginExists: true,
                productRelease: stableRelease,
            }),
        ).toEqual([]);
    });
});

describe('migration manifest', () => {
    const runnerA = 'backend/migrations/runMigrationAMigration.js';
    const runnerB = 'backend/migrations/runMigrationBMigration.js';

    const createManifest = () => ({
        schemaVersion: 1,
        migrations: [
            {
                id: 'migration-a',
                script: 'migration:a',
                runner: runnerA,
                dependsOn: [],
            },
            {
                id: 'migration-b',
                script: 'migration:b',
                runner: runnerB,
                dependsOn: ['migration-a'],
            },
        ],
    });

    const packageScripts = {
        'migration:a': 'node runner-a',
        'migration:b': 'node runner-b',
        test: 'vitest',
    };

    it('valide la correspondance scripts, runners et dépendances', () => {
        expect(
            collectMigrationManifestErrors({
                manifest: createManifest(),
                packageScripts,
                runnerPaths: [runnerA, runnerB],
            }),
        ).toEqual([]);
    });

    it('refuse un script package non inventorié', () => {
        const manifest = createManifest();
        manifest.migrations.pop();

        expect(
            collectMigrationManifestErrors({
                manifest,
                packageScripts,
                runnerPaths: [runnerA],
            }),
        ).toContain(
            'Le script package.json migration:b est absent du manifeste.',
        );
    });

    it('refuse une dépendance inconnue', () => {
        const manifest = createManifest();
        manifest.migrations[1].dependsOn = ['migration-inconnue'];

        expect(
            collectMigrationManifestErrors({
                manifest,
                packageScripts,
                runnerPaths: [runnerA, runnerB],
            }),
        ).toContain(
            "migration-b dépend d'une migration inconnue : migration-inconnue.",
        );
    });

    it('refuse un cycle de dépendances', () => {
        const manifest = createManifest();
        manifest.migrations[0].dependsOn = ['migration-b'];

        expect(
            collectMigrationManifestErrors({
                manifest,
                packageScripts,
                runnerPaths: [runnerA, runnerB],
            }),
        ).toContain(
            'Le manifeste de migrations contient un cycle de dépendances.',
        );
    });
});
