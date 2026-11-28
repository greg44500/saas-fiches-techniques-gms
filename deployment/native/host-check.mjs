import { execFile } from 'node:child_process';
import { lstat, realpath, mkdtemp, open, readFile, unlink, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { inspectNativeConfig } from './preflight.mjs';

const execute = promisify(execFile);
const probeContent = 'FichePilot native storage probe\n';
const roots = ['/var/lib/fichepilot/files', '/var/lib/fichepilot/tmp'];

/** Check only the directory and an exclusively created disposable probe. */
export async function withStorageProbe(directory, uid, gid, action) {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.uid !== uid || stat.gid !== gid
        || (stat.mode & 0o7777) !== 0o700 || await realpath(directory) !== directory) {
        throw new Error('Répertoire non conforme');
    }
    const scratch = await mkdtemp(join(directory, '.fichepilot-probe-'));
    const probe = join(scratch, 'probe.txt');
    let created = false;
    try {
        const handle = await open(probe, 'wx', 0o600);
        created = true;
        try {
            await handle.writeFile(probeContent);
        } finally {
            await handle.close();
        }
        if (await readFile(probe, 'utf8') !== probeContent) throw new Error('Lecture incohérente');
        await action(probe);
    } finally {
        // Never recursively remove a directory or touch pre-existing files.
        try {
            if (created) await unlink(probe);
        } finally {
            await rmdir(scratch);
        }
    }
}

/** Clean fixture, no output captured in logs, same scan timeout as the API. */
export async function scanCleanProbe(file, timeout, run = execute) {
    await run('/usr/bin/clamscan', [
        '--no-summary', '--stdout', '--fail-if-cvd-older-than=2', file,
    ], { timeout, maxBuffer: 64 * 1024, encoding: 'utf8' });
}

export async function verifyNativeHost(config, {
    platform = process.platform,
    uid = process.getuid?.(),
    gid = process.getgid?.(),
    probe = withStorageProbe,
    scan = scanCleanProbe,
} = {}) {
    if (platform !== 'linux' || !Number.isInteger(uid) || uid <= 0
        || !Number.isInteger(gid) || gid <= 0) throw new Error('Compte Linux non privilégié exigé');
    if (inspectNativeConfig(config).length) throw new Error('Configuration native invalide');
    await probe(roots[0], uid, gid, async () => {});
    await probe(roots[1], uid, gid, (file) => scan(file, Number(config.CLAMAV_SCAN_TIMEOUT_MS)));
}

const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
    try {
        await verifyNativeHost(process.env);
        console.log('Contrôle hôte OK : stockage et scan ClamAV de contrôle.');
    } catch {
        console.error('Contrôle hôte refusé : vérifier profil, permissions et signatures ClamAV.');
        process.exitCode = 1;
    }
}
