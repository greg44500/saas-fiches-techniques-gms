/**
 * Tests structurels hors réseau du packaging (ne remplacent PAS Docker build).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const compose = readFileSync(new URL('./compose.yaml', import.meta.url), 'utf8');
const caddy = readFileSync(new URL('./Caddyfile', import.meta.url), 'utf8');
const api = readFileSync(new URL('./Dockerfile.api', import.meta.url), 'utf8');
const web = readFileSync(new URL('./Dockerfile.web', import.meta.url), 'utf8');
const ignore = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');

test('le backend ne publie aucun port, seul le proxy reçoit 80/443', () => {
    const apiBlock = compose.split(/\n  api:\n/)[1].split(/\n  clamav_update:\n/)[0];
    const webBlock = compose.split(/\n  web:\n/)[1].split(/\n  api:\n/)[0];
    assert.doesNotMatch(apiBlock, /\n    ports:/);
    assert.match(webBlock, /"80:80"/);
    assert.match(webBlock, /"443:443"/);
});

test('le frontal ne reçoit pas le fichier de secrets SMTP/MongoDB', () => {
    const webBlock = compose.split(/\n  web:\n/)[1].split(/\n  api:\n/)[0];
    assert.doesNotMatch(webBlock, /env_file:/);
    assert.match(webBlock, /APP_DOMAIN=app\.fichepilot\.fr/);
});

test('le préfixe API est conservé et le fallback SPA existe', () => {
    assert.match(caddy, /@api path \/api \/api\/\*/);
    assert.match(caddy, /reverse_proxy api:5000/);
    assert.match(caddy, /try_files \{path\} \/index\.html/);
});

test('les fichiers utilisateur restent hors images et sur volume persistant', () => {
    assert.match(ignore, /uploads/);
    assert.match(ignore, /\*\*\/\.env/);
    assert.match(compose, /\/var\/lib\/fichepilot\/files:\/var\/lib\/fichepilot\/files/);
    assert.match(compose, /clamav_signatures:\/var\/lib\/clamav:ro/);
});

test('les images séparent les dépendances de compilation et le runtime Node', () => {
    assert.match(api, /npm ci --omit=dev/);
    assert.match(api, /USER node/);
    assert.match(api, /clamav/);
    assert.match(web, /npm run build/);
    assert.match(web, /COPY --from=build/);
});
