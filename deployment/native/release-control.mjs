import { execFile } from 'node:child_process';
import { lstat, readFile, readlink, realpath, mkdir, rmdir, symlink, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const run = promisify(execFile);
const root = '/opt/fichepilot';
const shaPattern = /^[0-9a-f]{40}$/;
const assertId = (id) => {
    if (typeof id !== 'string' || !shaPattern.test(id)) throw new Error('SHA Git complet requis');
    return id;
};

const assertRootOwned = async (path, directory) => {
    const stat = await lstat(path);
    if ((directory ? !stat.isDirectory() : !stat.isFile())
        || stat.uid !== 0 || (stat.mode & 0o022) !== 0) {
        throw new Error('Publication non sécurisée');
    }
};

/** Validate published code; never read an environment file or execute release code as root. */
export async function assertPublishedRelease(base, id) {
    const target = join(base, 'releases', assertId(id));
    for (const dir of [base, join(base, 'releases'), target, join(target, 'backend'),
        join(target, 'node_modules'), join(target, 'deployment'), join(target, 'frontend'),
        join(target, 'frontend/dist')]) {
        await assertRootOwned(dir, true);
        if (await realpath(dir) !== dir) throw new Error('Répertoire de publication indirect');
    }
    for (const file of ['release-commit.txt', 'backend/server.js', 'frontend/dist/index.html',
        'deployment/native/preflight.mjs', 'deployment/native/host-check.mjs',
        'core-origin.json', 'product-release.json']) {
        await assertRootOwned(join(target, file), false);
    }
    if ((await readFile(join(target, 'release-commit.txt'), 'utf8')).trim() !== id) {
        throw new Error('Provenance incohérente');
    }
}

export async function readPointer(base, name) {
    if (!['current', 'previous'].includes(name)) throw new Error('Pointeur inconnu');
    try {
        const target = await readlink(join(base, name));
        if (!/^releases\/[0-9a-f]{40}$/.test(target)) throw new Error('Pointeur invalide');
        return target.slice('releases/'.length);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

/** Replace one symlink atomically, on the same filesystem. */
export async function switchPointer(base, name, id) {
    assertId(id);
    await readPointer(base, name); // Refuse an existing real file or malformed pointer.
    const temporary = join(base, '.pointer-' + randomUUID());
    await symlink('releases/' + id, temporary, 'dir');
    try {
        await rename(temporary, join(base, name));
    } finally {
        await unlink(temporary).catch((error) => {
            if (error.code !== 'ENOENT') throw error;
        });
    }
}

export async function withActivationLock(base, action) {
    const lock = join(base, '.activation-lock');
    await mkdir(lock, { mode: 0o700 }); // EEXIST: refuse concurrent activation.
    try {
        return await action();
    } finally {
        await rmdir(lock);
    }
}

/**
 * Stop public traffic before switching the shared frontend/backend pointer.
 * No migrations, seeds, cleanup or automatic rollback are run here.
 * On failure leave the services stopped (best effort), preserving releases.
 */
export async function activateRelease(id, {
    compatible = false,
    validate,
    readCurrent,
    savePrevious,
    changeCurrent,
    stopWeb,
    stopApi,
    startApi,
    waitReady,
    startWeb,
}) {
    assertId(id);
    if (!compatible) throw new Error('Compatibilité DB explicitement requise');
    await validate(id);
    const old = await readCurrent();
    if (old) {
        assertId(old);
        await validate(old);
    }
    // Re-activating the current SHA is useful after repair; preserve previous.
    try {
        await stopWeb();
        await stopApi();
        if (old && old !== id) await savePrevious(old);
        await changeCurrent(id);
        await startApi();
        await waitReady();
        await startWeb();
        return { active: id, previous: old };
    } catch {
        const result = await Promise.allSettled([stopWeb(), stopApi()]);
        const stopped = result.every((entry) => entry.status === 'fulfilled');
        throw new Error(stopped
            ? 'Activation échouée ; services arrêtés. Vérifier puis réactiver un SHA compatible.'
            : 'Activation échouée ; arrêt non confirmé. Intervention immédiate nécessaire.');
    }
}

async function waitForReadiness() {
    // Only the dedicated local API; no secrets or remote request.
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/health/ready', {
                signal: AbortSignal.timeout(2000), redirect: 'error',
            });
            if (response.ok && (await response.json()).status === 'ready') return;
        } catch { /* Startup or database not ready yet. */ }
        await delay(1000);
    }
    throw new Error('Readiness indisponible');
}

async function main() {
    if (process.platform !== 'linux' || process.getuid?.() !== 0) {
        throw new Error('Exécution réservée à root sur Linux');
    }
    const [action, id, confirmation, ...rest] = process.argv.slice(2);
    if (action !== 'activate' || confirmation !== '--confirm-db-compatible' || rest.length) {
        throw new Error('Usage : activate SHA --confirm-db-compatible');
    }
    assertId(id);
    // Fixed trusted paths; do not use an operator-supplied directory as root.
    await assertRootOwned(root, true);
    if (await realpath(root) !== root) throw new Error('Racine de publication indirecte');
    const webPointer = '/srv/fichepilot/current';
    if (await readlink(webPointer) !== '/opt/fichepilot/current/frontend/dist') {
        throw new Error('Pointeur frontend incohérent');
    }
    const systemctl = (action, service) => run('/usr/bin/systemctl', [action, service], {
        timeout: 180000, maxBuffer: 64 * 1024,
    });
    const result = await withActivationLock(root, () => activateRelease(id, {
        compatible: true,
        validate: (sha) => assertPublishedRelease(root, sha),
        readCurrent: () => readPointer(root, 'current'),
        savePrevious: (sha) => switchPointer(root, 'previous', sha),
        changeCurrent: (sha) => switchPointer(root, 'current', sha),
        stopWeb: () => systemctl('stop', 'caddy.service'),
        stopApi: () => systemctl('stop', 'fichepilot.service'),
        startApi: () => systemctl('start', 'fichepilot.service'),
        waitReady: waitForReadiness,
        startWeb: () => systemctl('start', 'caddy.service'),
    }));
    console.log('Activation locale : ' + result.active);
    console.log('SHA précédent : ' + (result.previous || 'aucun'));
    console.log('Recette HTTPS publique et métier encore requise.');
}

const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
    try {
        await main();
    } catch (error) {
        // Do not print child process messages, paths, configuration or secrets.
        const allowed = [
            'Activation échouée ; services arrêtés. Vérifier puis réactiver un SHA compatible.',
            'Activation échouée ; arrêt non confirmé. Intervention immédiate nécessaire.',
        ];
        console.error(allowed.includes(error?.message)
            ? error.message : 'Activation refusée : vérifier SHA, verrou, publication, profil et services.');
        process.exitCode = 1;
    }
}
