import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectMongoTarget, verifyMongoReadOnly } from './mongo-verify.mjs';

const localUri = 'mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_dev?replicaSet=rs0';
const atlasUri = 'mongodb+srv://technical:secret@cluster.example.mongodb.net/fichepilot_beta?retryWrites=true&w=majority';

test('cible locale rs0 et base de développement dédiée acceptées', () => {
    assert.deepEqual(inspectMongoTarget({ target: 'local', expectedDatabase: 'saas_fiches_techniques_gms_dev', uri: localUri }),
        { target: 'local', database: 'saas_fiches_techniques_gms_dev' });
});

test('refuse une URL distante, ou une base de tests, en mode local', () => {
    assert.throws(() => inspectMongoTarget({ target: 'local', expectedDatabase: 'saas_fiches_techniques_gms_dev', uri: atlasUri }));
    assert.throws(() => inspectMongoTarget({ target: 'local', expectedDatabase: 'saas_fiches_techniques_gms_dev', uri: localUri.replace('_dev', '_e2e_test') }));
});

test('Atlas : authentification SRV requise et bases dev/tests refusées', () => {
    assert.equal(inspectMongoTarget({ target: 'atlas', expectedDatabase: 'fichepilot_beta', uri: atlasUri }).database, 'fichepilot_beta');
    for (const uri of [
        atlasUri.replace('fichepilot_beta', 'fichepilot_e2e_test'),
        atlasUri.replace('mongodb+srv', 'mongodb'),
        atlasUri.replace('technical:secret@', ''),
        atlasUri + '&tls=false',
    ]) {
        assert.throws(() => inspectMongoTarget({ target: 'atlas', expectedDatabase: uri.includes('e2e_test') ? 'fichepilot_e2e_test' : 'fichepilot_beta', uri }));
    }
});

test('refuse une base effective différente de celle explicitement attendue', () => {
    assert.throws(() => inspectMongoTarget({ target: 'atlas', expectedDatabase: 'autre_base', uri: atlasUri }));
});

test('le diagnostic réel n’effectue que ping, hello, findOne et abortTransaction', async () => {
    const actions = [];
    let inTransaction = false;
    const connection = {
        db: {
            databaseName: 'saas_fiches_techniques_gms_dev',
            admin() { return { command: async ({ ping, hello }) => {
                actions.push(ping ? 'ping' : hello ? 'hello' : 'other');
                return ping ? { ok: 1 } : { setName: 'rs0' };
            } }; },
            collection(name) {
                assert.equal(name, 'plans');
                return { async findOne(query, options) {
                    assert.deepEqual(query, {});
                    assert.deepEqual(options.projection, { _id: 1 });
                    actions.push('findOne');
                    return null;
                } };
            },
        },
        async startSession() { return {
            startTransaction(options) { assert.equal(options.readConcern.level, 'snapshot'); inTransaction = true; actions.push('startTransaction'); },
            inTransaction: () => inTransaction,
            async abortTransaction() { inTransaction = false; actions.push('abortTransaction'); },
            async endSession() { actions.push('endSession'); },
        }; },
        async close() { actions.push('close'); },
    };
    const result = await verifyMongoReadOnly({
        target: 'local', expectedDatabase: 'saas_fiches_techniques_gms_dev', uri: localUri,
        connectionFactory: async (_uri, options) => { assert.equal(options.autoIndex, false); actions.push('connect'); return connection; },
    });
    assert.equal(result.target, 'local');
    assert.deepEqual(actions, ['connect', 'ping', 'hello', 'startTransaction', 'findOne', 'abortTransaction', 'endSession', 'close']);
});

test('ferme la connexion après un échec de topologie', async () => {
    let closed = false;
    await assert.rejects(verifyMongoReadOnly({
        target: 'local', expectedDatabase: 'saas_fiches_techniques_gms_dev', uri: localUri,
        connectionFactory: async () => ({
            db: { databaseName: 'saas_fiches_techniques_gms_dev', admin: () => ({ command: async ({ hello }) => hello ? { setName: 'wrong' } : { ok: 1 } }) },
            close: async () => { closed = true; },
        }),
    }));
    assert.equal(closed, true);
});
