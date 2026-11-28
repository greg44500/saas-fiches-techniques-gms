/**
 * Validation hors réseau des paramètres de déploiement FichePilot.
 * Aucun secret n'est affiché, aucune connexion Atlas, DNS ou Brevo n'est faite.
 * La validation Zod Core au démarrage demeure l'autorité.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const required = [
    'APP_DOMAIN', 'ACME_EMAIL', 'NODE_ENV', 'CLIENT_URL',
    'MONGODB_URI', 'JWT_ACCESS_SECRET', 'TRIAL_IDENTITY_SECRET',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER',
    'SMTP_PASSWORD', 'SMTP_FROM_EMAIL', 'SMTP_FROM_NAME',
    'FILE_STORAGE_PROVIDER', 'LOCAL_STORAGE_ROOT_DIR',
    'UPLOAD_TEMP_DIR', 'CLAMAV_BINARY_PATH',
];

const unresolved = (value) => (
    !value || /^(?:REPLACE_|CHANGE_|your_|example|placeholder)/i.test(value)
);

export const inspectProductionConfig = (config) => {
    const errors = [];

    for (const field of required) {
        if (unresolved(config[field])) {
            errors.push(field + ' : valeur absente ou non remplacée');
        }
    }

    if (config.APP_DOMAIN !== 'app.fichepilot.fr') {
        errors.push('APP_DOMAIN : app.fichepilot.fr attendu');
    }
    if (config.NODE_ENV !== 'production') {
        errors.push('NODE_ENV : production exigé');
    }
    if (config.CLIENT_URL !== 'https://app.fichepilot.fr') {
        errors.push('CLIENT_URL : origine HTTPS attendue');
    }
    if (config.E2E_BYPASS_RATE_LIMITS !== 'false') {
        errors.push('E2E_BYPASS_RATE_LIMITS : false exigé');
    }
    if (config.ALLOW_DEVELOPMENT_DATA_RESET !== 'false') {
        errors.push('ALLOW_DEVELOPMENT_DATA_RESET : false exigé');
    }
    if (config.FILE_STORAGE_PROVIDER !== 'local') {
        errors.push('FILE_STORAGE_PROVIDER : local exigé');
    }
    if (config.LOCAL_STORAGE_ROOT_DIR !== '/var/lib/fichepilot/files') {
        errors.push('LOCAL_STORAGE_ROOT_DIR : chemin persistant inattendu');
    }
    if (config.UPLOAD_TEMP_DIR !== '/var/lib/fichepilot/tmp') {
        errors.push('UPLOAD_TEMP_DIR : chemin temporaire inattendu');
    }
    if (config.CLAMAV_BINARY_PATH !== 'clamscan') {
        errors.push('CLAMAV_BINARY_PATH : clamscan requis dans l’image');
    }

    if (config.SMTP_HOST !== 'smtp-relay.brevo.com'
        || config.SMTP_PORT !== '465'
        || config.SMTP_SECURE !== 'true') {
        errors.push('SMTP : profil Brevo 465/TLS implicite requis');
    }
    if (!config.SMTP_FROM_EMAIL?.endsWith('@fichepilot.fr')) {
        errors.push('SMTP_FROM_EMAIL : domaine fichepilot.fr requis');
    }

    for (const field of ['JWT_ACCESS_SECRET', 'TRIAL_IDENTITY_SECRET']) {
        if (!unresolved(config[field]) && config[field].length < 32) {
            errors.push(field + ' : 32 caractères minimum');
        }
    }
    if (config.JWT_ACCESS_SECRET && config.JWT_ACCESS_SECRET === config.TRIAL_IDENTITY_SECRET) {
        errors.push('JWT_ACCESS_SECRET et TRIAL_IDENTITY_SECRET : clés distinctes');
    }

    try {
        const db = new URL(config.MONGODB_URI);
        const dbName = decodeURIComponent(db.pathname.slice(1));
        if (db.protocol !== 'mongodb+srv:' || !dbName
            || /(?:^|[_-])(?:dev|test|e2e)(?:$|[_-])/i.test(dbName)) {
            errors.push('MONGODB_URI : cluster Atlas SRV et base bêta dédiée requis');
        }
        if (unresolved(db.username) || unresolved(db.password)
            || /^REPLACE_/i.test(db.hostname)) {
            errors.push('MONGODB_URI : identifiants ou hôte non renseignés');
        }
    } catch {
        errors.push('MONGODB_URI : URL invalide');
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.ACME_EMAIL || '')) {
        errors.push('ACME_EMAIL : adresse réelle requise');
    }

    return errors;
};

export const inspectProductionFile = (filePath) =>
    inspectProductionConfig(parseEnv(readFileSync(filePath, 'utf8')));

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
    try {
        const errors = inspectProductionFile(resolve(process.argv[2] || '.env.production'));
        if (errors.length) {
            console.error('Préflight refusé :\n' + errors.join('\n'));
            process.exitCode = 1;
        } else {
            console.log('Préflight structurel OK : DNS, Atlas, SMTP et Docker non testés.');
        }
    } catch {
        console.error('Préflight impossible : fichier absent ou illisible.');
        process.exitCode = 1;
    }
}
