/**
 * Classe les migrations d'après les dépendances du manifeste canonique.
 * Ne lance aucune migration ; un ordre topologique ne prouve pas la
 * pertinence métier d'une migration pour une base Atlas initialement vide.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const orderDeclaredMigrations = (migrations) => {
    const byId = new Map();
    for (const migration of migrations) {
        if (!migration.id || !migration.script || byId.has(migration.id)) {
            throw new Error('Migration incomplète ou identifiant dupliqué.');
        }
        byId.set(migration.id, migration);
    }

    const ordered = [];
    const visited = new Map();
    const visit = (migration) => {
        const status = visited.get(migration.id);
        if (status === 'complete') return;
        if (status === 'active') throw new Error('Cycle de dépendances de migrations.');
        visited.set(migration.id, 'active');
        for (const dependencyId of migration.dependsOn || []) {
            const dependency = byId.get(dependencyId);
            if (!dependency) throw new Error('Dépendance de migration inconnue.');
            visit(dependency);
        }
        visited.set(migration.id, 'complete');
        ordered.push(migration);
    };

    migrations.forEach(visit);
    return ordered;
};

const invokedDirectly = process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
    const manifest = JSON.parse(readFileSync(
        new URL('../docs/releases/migration-manifest.json', import.meta.url),
        'utf8',
    ));
    for (const migration of orderDeclaredMigrations(manifest.migrations)) {
        console.log('npm run ' + migration.script);
    }
    console.log('Plan de LECTURE seulement : aucune migration exécutée.');
}
