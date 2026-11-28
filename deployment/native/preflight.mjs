import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { inspectProductionConfig } from '../preflight.mjs';

/**
 * FichePilot native profile. Never prints values or opens a network connection.
 * Core Zod validation still runs when the actual application starts.
 */
export function inspectNativeConfig(config) {
    const errors = inspectProductionConfig(config);
    const exact = {
        HTTP_BIND_HOST: '127.0.0.1',
        HTTP_TRUST_PROXY: 'loopback',
        PORT: '5000',
    };
    for (const [field, expected] of Object.entries(exact)) {
        if (config[field] !== expected) errors.push(field + ' : profil natif invalide');
    }
    const positiveIntegerFields = {
        UPLOAD_MAX_FILE_SIZE_BYTES: [1, 5242880],
        FILE_RETENTION_DAYS: [1, Number.MAX_SAFE_INTEGER],
        CLAMAV_SCAN_TIMEOUT_MS: [1000, 120000],
        UPLOAD_TEMP_FILE_MAX_AGE_MINUTES: [5, 10080],
        PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: [5, 15],
        REFRESH_TOKEN_EXPIRES_IN_DAYS: [1, 30],
        WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS: [1, 24],
    };
    for (const [field, [min, max]] of Object.entries(positiveIntegerFields)) {
        const value = config[field];
        if (typeof value !== 'string' || !/^\d+$/.test(value)
            || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
            errors.push(field + ' : entier hors contrat natif');
        }
    }
    // This profile intentionally accepts a small allowlist of Atlas URI options.
    try {
        const uri = new URL(config.MONGODB_URI);
        const allowed = new Map([
            ['retrywrites', (v) => v === 'true'],
            ['w', (v) => v === 'majority'],
            ['appname', (v) => v.trim() !== ''],
            ['authsource', (v) => v === 'admin'],
            ['tls', (v) => v === 'true'],
        ]);
        const seen = new Set();
        let valid = uri.protocol === 'mongodb+srv:'
            && uri.hostname.endsWith('.mongodb.net')
            && !uri.port && !uri.hash
            && decodeURIComponent(uri.pathname.slice(1)) === 'fichepilot_beta';
        for (const [key, value] of uri.searchParams) {
            const name = key.toLowerCase();
            if (seen.has(name) || !allowed.get(name)?.(value)) valid = false;
            seen.add(name);
        }
        if (!seen.has('retrywrites') || !seen.has('w')) valid = false;
        if (!valid) errors.push('MONGODB_URI : profil Atlas beta ou options TLS invalides');
    } catch {
        errors.push('MONGODB_URI : profil Atlas invalide');
    }
    return [...new Set(errors)];
}

const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
    try {
        // systemd supplies the environment to the unprivileged service.
        // The root-owned secret file need not be readable by that account.
        if (process.argv.length !== 3) throw new Error('Argument requis');
        const config = process.argv[2] === '--environment'
            ? process.env
            : parseEnv(readFileSync(resolve(process.argv[2]), 'utf8'));
        const errors = inspectNativeConfig(config);
        if (errors.length) {
            console.error('Préflight natif refusé :\n' + errors.join('\n'));
            process.exitCode = 1;
        } else {
            console.log('Préflight natif OK : configuration structurelle uniquement.');
        }
    } catch {
        console.error('Préflight natif impossible : fournir --environment ou un fichier explicite.');
        process.exitCode = 1;
    }
}
