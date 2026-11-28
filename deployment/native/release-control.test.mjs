import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { activateRelease, readPointer, switchPointer, withActivationLock } from './release-control.mjs';

const old = 'a'.repeat(40);
const next = 'b'.repeat(40);
const setup = (overrides = {}) => {
    const calls = [];
    const step = (name) => async (...args) => { calls.push([name, ...args]); };
    return { calls, options: {
        compatible: true,
        validate: step('validate'),
        readCurrent: async () => old,
        savePrevious: step('previous'),
        changeCurrent: step('current'),
        stopWeb: step('stopWeb'), stopApi: step('stopApi'),
        startApi: step('startApi'), waitReady: step('ready'), startWeb: step('startWeb'),
        ...overrides,
    } };
};

test('activation : frontend arrêté avant API et publication après arrêt', async () => {
    const { calls, options } = setup();
    assert.deepEqual(await activateRelease(next, options), { active: next, previous: old });
    assert.deepEqual(calls, [
        ['validate', next], ['validate', old], ['stopWeb'], ['stopApi'],
        ['previous', old], ['current', next], ['startApi'], ['ready'], ['startWeb'],
    ]);
});

test('première installation sans version précédente', async () => {
    const { calls, options } = setup({ readCurrent: async () => null });
    await activateRelease(next, options);
    assert.ok(!calls.some(([name]) => name === 'previous'));
});

test('réactivation du même SHA conserve previous', async () => {
    const { calls, options } = setup({ readCurrent: async () => next });
    await activateRelease(next, options);
    assert.ok(!calls.some(([name]) => name === 'previous'));
});

test('refuse un SHA invalide ou une compatibilité non confirmée avant toute action', async () => {
    const { calls, options } = setup({ compatible: false });
    await assert.rejects(activateRelease(next, options));
    await assert.rejects(activateRelease('../invalid', { ...options, compatible: true }));
    assert.deepEqual(calls, []);
});

test('une publication invalide ne coupe pas le service existant', async () => {
    const { calls, options } = setup({ validate: async () => { throw new Error('invalid'); } });
    await assert.rejects(activateRelease(next, options), /invalid/);
    assert.deepEqual(calls, []);
});

test('readiness en échec : pas de démarrage web, pas de rollback automatique', async () => {
    const { calls, options } = setup({ waitReady: async () => { throw new Error('secret-uri'); } });
    await assert.rejects(activateRelease(next, options), /services arrêtés/);
    assert.equal(calls.filter(([name]) => name === 'current').length, 1);
    assert.ok(!calls.some(([name]) => name === 'startWeb'));
    assert.deepEqual(calls.slice(-2), [['stopWeb'], ['stopApi']]);
});

test('arrêt HTTP en échec : aucun changement de pointeur', async () => {
    const { calls, options } = setup({ stopApi: async () => { throw new Error('stop failed'); } });
    await assert.rejects(activateRelease(next, options), /arrêt non confirmé/);
    assert.ok(!calls.some(([name]) => name === 'current'));
});

test('verrou exclusif et libération après échec', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fichepilot-lock-'));
    try {
        await withActivationLock(dir, async () => {
            await assert.rejects(withActivationLock(dir, async () => assert.fail('concurrent')));
        });
        await assert.rejects(withActivationLock(dir, async () => { throw new Error('failure'); }));
        await withActivationLock(dir, async () => {});
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('pointeur réel atomique et refus d’un fichier ordinaire', {
    skip: process.platform !== 'linux',
}, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fichepilot-pointer-'));
    try {
        await mkdir(join(dir, 'releases'));
        await mkdir(join(dir, 'releases', old));
        await mkdir(join(dir, 'releases', next));
        assert.equal(await readPointer(dir, 'current'), null);
        await switchPointer(dir, 'current', old);
        await switchPointer(dir, 'current', next);
        assert.equal(await readPointer(dir, 'current'), next);
        await writeFile(join(dir, 'previous'), 'keep');
        await assert.rejects(switchPointer(dir, 'previous', old));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
