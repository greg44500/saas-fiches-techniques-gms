import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBootstrapPlan } from './bootstrap-plan.mjs';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const manifest = read('../../docs/releases/migration-manifest.json');
const classification = read('./bootstrap-classification.json');
const scripts = read('../../package.json').scripts;

test('chaque migration et chaque seed sont classés une seule fois', () => {
    const plan = buildBootstrapPlan(manifest, classification, scripts);
    assert.equal(plan.migrations.length, manifest.migrations.length);
    assert.equal(plan.status, 'candidate-not-qualified');
    assert.equal(plan.seedCandidates.length + plan.historicalSeed.length,
        Object.keys(scripts).filter((name) => name.startsWith('seed:')).length);
});

test('une migration nouvelle sans classification bloque le plan', () => {
    assert.throws(() => buildBootstrapPlan({
        ...manifest, migrations: [...manifest.migrations, { id: 'new', script: 'migration:new' }],
    }, classification, scripts), /désynchronisée/);
});

test('refuse doublon ou catégorie inconnue', () => {
    assert.throws(() => buildBootstrapPlan(manifest, {
        ...classification, migrations: [...classification.migrations, classification.migrations[0]],
    }, scripts));
    assert.throws(() => buildBootstrapPlan(manifest, {
        ...classification, migrations: classification.migrations.map((entry, i) =>
            i ? entry : { ...entry, category: 'run-everything' }),
    }, scripts));
});

test('un nouveau seed non classé bloque le plan', () => {
    assert.throws(() => buildBootstrapPlan(manifest, classification, { ...scripts, 'seed:new': 'node new.js' }));
});

test('les opérations historiques restent distinguées des index opérationnels et seeds', () => {
    const plan = buildBootstrapPlan(manifest, classification, scripts);
    const category = (id) => plan.migrations.find((entry) => entry.id === id).category;
    assert.equal(category('operational-indexes'), 'additive-index');
    assert.equal(category('m002-catalog'), 'mixed-index');
    assert.equal(category('m003-indicative-pricing'), 'reference-seed');
    assert.equal(category('baseline-remove-file-upload'), 'plan-seed');
    assert.ok(plan.historicalSeed.includes('seed:m002-governance'));
});
