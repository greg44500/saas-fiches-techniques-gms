import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { orderDeclaredMigrations } from '../migration-plan.mjs';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const categories = new Set(['historical', 'additive-index', 'schema-index',
    'role-backfill', 'plan-seed', 'mixed-index', 'reference-seed', 'workspace-seed']);

/** This is a review inventory, not a migration executor. */
export function buildBootstrapPlan(manifest, classification, scripts) {
    if (classification.schemaVersion !== 1 || classification.status !== 'candidate-not-qualified') {
        throw new Error('Classification de bootstrap non reconnue');
    }
    const entries = new Map();
    for (const item of classification.migrations) {
        if (!item.id || entries.has(item.id) || !categories.has(item.category) || !item.reason?.trim()) {
            throw new Error('Classification incomplète ou dupliquée');
        }
        entries.set(item.id, item);
    }
    const ordered = orderDeclaredMigrations(manifest.migrations);
    if (entries.size !== ordered.length || ordered.some(({ id }) => !entries.has(id))) {
        throw new Error('Classification désynchronisée du manifeste');
    }
    const seedNames = [...classification.seedCandidates, ...classification.historicalSeed];
    const declared = Object.keys(scripts).filter((name) => name.startsWith('seed:'));
    if (new Set(seedNames).size !== seedNames.length || seedNames.length !== declared.length
        || declared.some((name) => !seedNames.includes(name))) {
        throw new Error('Classification des seeds désynchronisée');
    }
    return {
        status: classification.status,
        migrations: ordered.map(({ id, script }) => ({ ...entries.get(id), script })),
        seedCandidates: [...classification.seedCandidates],
        historicalSeed: [...classification.historicalSeed],
    };
}

const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
    try {
        const plan = buildBootstrapPlan(read('../../docs/releases/migration-manifest.json'),
            read('./bootstrap-classification.json'), read('../../package.json').scripts);
        console.log('Classification candidate : ' + plan.migrations.length + ' migrations ; '
            + plan.seedCandidates.length + ' seeds candidats ; ' + plan.historicalSeed.length + ' historique.');
        for (const entry of plan.migrations) console.log(entry.id + ' | ' + entry.category);
        console.log('Seeds candidats (ordre de revue, pas de commande) : ' + plan.seedCandidates.join(', '));
        console.log('Plan de lecture non qualifié : aucune opération MongoDB exécutée.');
    } catch {
        console.error('Classification bootstrap invalide ou désynchronisée.');
        process.exitCode = 1;
    }
}
