import assert from 'node:assert/strict';
import test from 'node:test';
import { orderDeclaredMigrations } from './migration-plan.mjs';

test('une dépendance est placée avant son consommateur', () => {
    const migrations = [
        { id: 'child', script: 'migration:child', dependsOn: ['parent'] },
        { id: 'parent', script: 'migration:parent', dependsOn: [] },
    ];
    assert.deepEqual(
        orderDeclaredMigrations(migrations).map((item) => item.id),
        ['parent', 'child'],
    );
});

test('un identifiant de dépendance inconnu est refusé', () => {
    assert.throws(
        () => orderDeclaredMigrations([
            { id: 'child', script: 'migration:child', dependsOn: ['missing'] },
        ]),
        /inconnue/,
    );
});

test('un cycle de dépendances est refusé', () => {
    assert.throws(
        () => orderDeclaredMigrations([
            { id: 'a', script: 'migration:a', dependsOn: ['b'] },
            { id: 'b', script: 'migration:b', dependsOn: ['a'] },
        ]),
        /Cycle/,
    );
});
