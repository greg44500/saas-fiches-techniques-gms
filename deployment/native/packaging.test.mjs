import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const proxy = read('./Caddyfile');
const service = read('./fichepilot.service');
const env = read('./production.env.example');

test('profil natif : écoute loopback et proxy explicite', () => {
    assert.match(env, /^HTTP_BIND_HOST=127\.0\.0\.1$/m);
    assert.match(env, /^HTTP_TRUST_PROXY=loopback$/m);
    assert.match(proxy, /reverse_proxy 127\.0\.0\.1:5000/);
});

test('proxy conserve /api et remplace les en-têtes transmis', () => {
    assert.match(proxy, /@api path \/api \/api\/\*/);
    assert.match(proxy, /header_up X-Forwarded-For \{remote_host\}/);
    assert.match(proxy, /header_up X-Forwarded-Host \{host\}/);
    assert.match(proxy, /header_up X-Forwarded-Proto \{scheme\}/);
});

test('frontend isolé du code serveur et fallback SPA', () => {
    assert.match(proxy, /root \* \/srv\/fichepilot\/current/);
    assert.match(proxy, /try_files \{path\} \/index\.html/);
    assert.doesNotMatch(proxy, /\/etc\/fichepilot|\/opt\/fichepilot/);
});

test('unité non privilégiée et environnement séparé', () => {
    assert.match(service, /^User=fichepilot$/m);
    assert.match(service, /^Group=fichepilot$/m);
    assert.match(service, /^EnvironmentFile=\/etc\/fichepilot\/fichepilot\.env$/m);
    assert.match(service, /^NoNewPrivileges=true$/m);
    assert.match(service, /^ProtectSystem=strict$/m);
    assert.match(service, /^ReadWritePaths=\/var\/lib\/fichepilot\/files \/var\/lib\/fichepilot\/tmp$/m);
});

test('systemd applique les contrôles avant le démarrage du backend', () => {
    assert.match(service, /^ExecStartPre=\/usr\/bin\/node deployment\/native\/preflight\.mjs --environment$/m);
    assert.match(service, /^ExecStartPre=\/usr\/bin\/node deployment\/native\/host-check\.mjs$/m);
    assert.match(service, /^Environment=PATH=\/usr\/bin:\/bin$/m);
    assert.match(service, /^TimeoutStartSec=150s$/m);
});

test('les scripts de livraison n’embarquent pas de configuration réelle et ne lancent pas de migrations', () => {
    const stage = read('./stage-release.sh');
    const publish = read('./publish-release.sh');
    const layout = read('./bootstrap-layout.sh');
    assert.match(stage, /git -C "\$git_root" archive "\$sha"/);
    assert.match(stage, /env -i PATH=\/usr\/bin:\/bin/);
    assert.match(stage, /ci --omit=dev/);
    assert.match(publish, /chown -hR root:fichepilot/);
    assert.match(publish, /chmod -R g\+rX,go-w,o-rwx/);
    assert.match(layout, /ln -s \/opt\/fichepilot\/current\/frontend\/dist/);
    for (const script of [stage, publish, layout]) assert.doesNotMatch(script, /npm run (?:migration|seed):/);
});
