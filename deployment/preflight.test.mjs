import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { inspectProductionConfig } from './preflight.mjs';

const template = parseEnv(readFileSync(
    new URL('./production.env.example', import.meta.url),
    'utf8',
));

const valid = () => ({
    ...template,
    ACME_EMAIL: 'ops@somewhere.example',
    MONGODB_URI: 'mongodb+srv://user:password@cluster.example.mongodb.net/fichepilot_beta?retryWrites=true&w=majority',
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    TRIAL_IDENTITY_SECRET: 'b'.repeat(40),
    SMTP_USER: 'brevo-user@example.org',
    SMTP_PASSWORD: 'brevo-smtp-key',
});

test('les placeholders du modèle rendent le modèle non déployable', () => {
    assert.ok(inspectProductionConfig(template).length > 0);
});

test('une configuration de forme valide passe hors réseau', () => {
    assert.deepEqual(inspectProductionConfig(valid()), []);
});

test('pas de développement, E2E bypass ou base de test en production', () => {
    const broken = {
        ...valid(),
        NODE_ENV: 'development',
        E2E_BYPASS_RATE_LIMITS: 'true',
        MONGODB_URI: 'mongodb+srv://user:password@cluster.example.mongodb.net/fichepilot_e2e_test',
    };
    const messages = inspectProductionConfig(broken).join(' ');
    assert.match(messages, /NODE_ENV/);
    assert.match(messages, /E2E_BYPASS_RATE_LIMITS/);
    assert.match(messages, /MONGODB_URI/);
});

test('une origine HTTP ou un SMTP non chiffré sont refusés', () => {
    const messages = inspectProductionConfig({
        ...valid(),
        CLIENT_URL: 'http://app.fichepilot.fr',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
    }).join(' ');
    assert.match(messages, /CLIENT_URL/);
    assert.match(messages, /SMTP/);
});

test('les messages de contrôle ne divulguent aucun identifiant', () => {
    const password = 'secret_ne_jamais_afficher';
    const messages = inspectProductionConfig({
        ...valid(),
        SMTP_PASSWORD: password,
        SMTP_HOST: 'wrong',
    }).join(' ');
    assert.equal(messages.includes(password), false);
});
