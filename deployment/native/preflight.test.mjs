import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { inspectNativeConfig } from './preflight.mjs';

const template = parseEnv(readFileSync(new URL('./production.env.example', import.meta.url), 'utf8'));
const valid = () => ({
    ...template,
    ACME_EMAIL: 'ops@example.test',
    MONGODB_URI: 'mongodb+srv://user:password@cluster.example.mongodb.net/fichepilot_beta?retryWrites=true&w=majority',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    TRIAL_IDENTITY_SECRET: 'b'.repeat(40),
    SMTP_USER: 'smtp-user@example.test',
    SMTP_PASSWORD: 'smtp-key-for-test',
});

test('refuse le modèle non renseigné et accepte une configuration fictive conforme', () => {
    assert.ok(inspectNativeConfig(template).length);
    assert.deepEqual(inspectNativeConfig(valid()), []);
});

test('refuse une écoute publique, un proxy global ou un port divergent', () => {
    const errors = inspectNativeConfig({
        ...valid(), HTTP_BIND_HOST: '0.0.0.0', HTTP_TRUST_PROXY: 'true', PORT: '5001',
    }).join(' ');
    for (const field of ['HTTP_BIND_HOST', 'HTTP_TRUST_PROXY', 'PORT']) assert.ok(errors.includes(field));
});

test('refuse les bases non prévues et les options Atlas non autorisées', () => {
    const uri = valid().MONGODB_URI;
    for (const MONGODB_URI of [
        uri.replace('fichepilot_beta', 'other_beta'),
        uri.replace('.mongodb.net', '.invalid.test'),
        uri + '&tls=false',
        uri + '&tlsInsecure=true',
        uri + '&tlsAllowInvalidCertificates=true',
        uri + '&TLS=true&tls=true',
        uri.replace('w=majority', 'w=1'),
        uri.replace('retryWrites=true&', ''),
    ]) assert.match(inspectNativeConfig({ ...valid(), MONGODB_URI }).join(' '), /MONGODB_URI/);
});

test('accepte les options Atlas usuelles autorisées', () => {
    assert.deepEqual(inspectNativeConfig({
        ...valid(), MONGODB_URI: valid().MONGODB_URI + '&appName=gms-beta&tls=true&authSource=admin',
    }), []);
});

test('refuse les bornes invalides et les paramètres absents', () => {
    const errors = inspectNativeConfig({
        ...valid(), CLAMAV_SCAN_TIMEOUT_MS: 'NaN', UPLOAD_MAX_FILE_SIZE_BYTES: '5242881',
        FILE_RETENTION_DAYS: undefined, PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: '16',
    }).join(' ');
    for (const field of ['CLAMAV_SCAN_TIMEOUT_MS', 'UPLOAD_MAX_FILE_SIZE_BYTES',
        'FILE_RETENTION_DAYS', 'PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES']) assert.ok(errors.includes(field));
});

test('les erreurs ne contiennent pas la valeur des secrets', () => {
    const secret = 'secret-in-uri-never-print';
    const errors = inspectNativeConfig({
        ...valid(), MONGODB_URI: 'mongodb+srv://user:' + secret + '@invalid.test/other',
    }).join(' ');
    assert.equal(errors.includes(secret), false);
});
