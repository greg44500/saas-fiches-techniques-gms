import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, realpath, rm, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { scanCleanProbe, verifyNativeHost, withStorageProbe } from './host-check.mjs';

const template = parseEnv(readFileSync(new URL('./production.env.example', import.meta.url), 'utf8'));
const valid = () => ({
    ...template, ACME_EMAIL: 'ops@example.test',
    MONGODB_URI: 'mongodb+srv://user:password@cluster.example.mongodb.net/fichepilot_beta?retryWrites=true&w=majority',
    JWT_ACCESS_SECRET: 'a'.repeat(40), TRIAL_IDENTITY_SECRET: 'b'.repeat(40),
    SMTP_USER: 'smtp-user@example.test', SMTP_PASSWORD: 'smtp-key-for-test',
});

test('refuse root et un environnement non Linux avant toute écriture', async () => {
    const probe = async () => assert.fail('aucune écriture attendue');
    await assert.rejects(verifyNativeHost(valid(), { platform: 'linux', uid: 0, gid: 0, probe }));
    await assert.rejects(verifyNativeHost(valid(), { platform: 'win32', uid: 1000, gid: 1000, probe }));
});

test('refuse la configuration invalide avant les sondes', async () => {
    await assert.rejects(verifyNativeHost(template, {
        platform: 'linux', uid: 1000, gid: 1000, probe: async () => assert.fail('sonde interdite'),
    }));
});

test('contrôle les deux racines mais ne scanne que le fichier de contrôle temporaire', async () => {
    const calls = [];
    await verifyNativeHost(valid(), {
        platform: 'linux', uid: 1000, gid: 1000,
        probe: async (dir, uid, gid, action) => {
            calls.push([dir, uid, gid]);
            await action(dir + '/probe.txt');
        },
        scan: async (file, timeout) => calls.push([file, timeout]),
    });
    assert.deepEqual(calls, [
        ['/var/lib/fichepilot/files', 1000, 1000],
        ['/var/lib/fichepilot/tmp', 1000, 1000],
        ['/var/lib/fichepilot/tmp/probe.txt', 30000],
    ]);
});

test('le scanner refuse toute erreur et impose la fraîcheur des signatures', async () => {
    const error = new Error('scanner failure');
    await assert.rejects(scanCleanProbe('/tmp/probe.txt', 30000, async (command, args, opts) => {
        assert.equal(command, '/usr/bin/clamscan');
        assert.ok(args.includes('--fail-if-cvd-older-than=2'));
        assert.equal(opts.timeout, 30000);
        throw error;
    }), (caught) => caught === error);
});

test('la sonde de stockage nettoie son fichier même si le contrôle échoue', {
    skip: process.platform !== 'linux',
}, async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'fichepilot-test-')));
    try {
        const dir = join(root, 'files');
        await mkdir(dir, { mode: 0o700 });
        await assert.rejects(withStorageProbe(dir, process.getuid(), process.getgid(), async (file) => {
            assert.match(await readFile(file, 'utf8'), /FichePilot/);
            throw new Error('échec volontaire');
        }), /échec volontaire/);
        assert.deepEqual(await readdir(dir), []);
        const alias = join(root, 'alias');
        await symlink(dir, alias);
        await assert.rejects(withStorageProbe(alias, process.getuid(), process.getgid(), async () => {}));
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
