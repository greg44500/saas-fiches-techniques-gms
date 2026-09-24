import 'dotenv/config';
import { z } from 'zod';
import { FILE_STORAGE_PROVIDER } from '../constants/file.constants.js';

const PRODUCTION_PLACEHOLDER_VALUES = new Set([
    'replace_with_a_long_random_secret',
    'replace_with_a_dedicated_long_random_secret',
    'your_smtp_username',
    'your_smtp_password',
]);

const isKnownPlaceholder = (value) => (
    typeof value === 'string'
    && PRODUCTION_PLACEHOLDER_VALUES.has(value.trim())
);

const getMongoDatabaseName = (mongodbUri) => {
    try {
        const parsedUri = new URL(mongodbUri);

        return decodeURIComponent(
            parsedUri.pathname.replace(/^\//, ''),
        );
    } catch {
        return '';
    }
};

// Schema de validation pour les variables d'environnement.
const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),

    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CLIENT_URL: z
        .url({
            protocol: /^https?$/,
            error: 'CLIENT_URL doit être une URL HTTP ou HTTPS valide',
        }),
    MONGODB_URI: z
        .string()
        .trim()
        .min(1, 'MONGODB_URI est obligatoire')
        .refine(
            (value) => /^mongodb(?:\+srv)?:\/\/.+/.test(value),
            'MONGODB_URI doit commencer par mongodb:// ou mongodb+srv://',
        ),

    JWT_ACCESS_SECRET: z
        .string()
        .min(32, 'JWT_ACCESS_SECRET doit contenir au minimum 32 caractères'),

    JWT_ACCESS_EXPIRES_IN: z
        .string()
        .default('15m'),

    JWT_ACCESS_ISSUER: z
        .string()
        .min(1)
        .default('saas-core-api'),

    JWT_ACCESS_AUDIENCE: z
        .string()
        .min(1)
        .default('saas-core-api'),

    REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce
        .number()
        .int()
        .min(1)
        .max(30)
        .default(7),

    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: z.coerce
        .number()
        .int()
        .min(5)
        .max(15)
        .default(15),

    /*
     * Fenêtre de sécurité d'une autorisation exceptionnelle de transfert de
     * propriété. Le plafond code-owned de 24 h empêche une mauvaise
     * configuration de laisser ce workflow sensible ouvert trop longtemps.
     */
    WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS: z.coerce
        .number()
        .int()
        .min(1)
        .max(24)
        .default(24),

    SMTP_HOST: z
        .string()
        .trim()
        .min(1, 'SMTP_HOST est obligatoire'),

    SMTP_PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535),

    SMTP_SECURE: z
        .enum(['true', 'false'])
        .transform((value) => value === 'true'),

    SMTP_USER: z
        .string()
        .trim()
        .min(1, 'SMTP_USER est obligatoire'),

    SMTP_PASSWORD: z
        .string()
        .min(1, 'SMTP_PASSWORD est obligatoire'),

    SMTP_FROM_EMAIL: z
        .email('SMTP_FROM_EMAIL doit être une adresse email valide'),

    SMTP_FROM_NAME: z
        .string()
        .trim()
        .min(1, 'SMTP_FROM_NAME est obligatoire'),

    UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce
        .number()
        .int()
        .positive(),

    FILE_RETENTION_DAYS: z.coerce
        .number()
        .int()
        .positive(),

    FILE_STORAGE_PROVIDER: z.literal(
        FILE_STORAGE_PROVIDER.LOCAL,
    ),

    LOCAL_STORAGE_ROOT_DIR: z
        .string()
        .trim()
        .min(
            1,
            'LOCAL_STORAGE_ROOT_DIR est obligatoire',
        ),

    UPLOAD_TEMP_DIR: z
        .string()
        .trim()
        .min(
            1,
            'UPLOAD_TEMP_DIR est obligatoire',
        ),

    CLAMAV_BINARY_PATH: z
        .string()
        .trim()
        .min(1, 'CLAMAV_BINARY_PATH est obligatoire'),

    CLAMAV_SCAN_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(1000)
        .max(120000),

    /*
     * Durée pendant laquelle un fichier temporaire est protégé contre la
     * purge. La valeur minimale de cinq minutes empêche une configuration
     * accidentelle de cibler des uploads encore actifs.
     */
    UPLOAD_TEMP_FILE_MAX_AGE_MINUTES: z.coerce
        .number()
        .int()
        .min(5)
        .max(10080)
        .default(60),

    /*
     * Secret dédié à la génération des empreintes HMAC utilisées pour
     * identifier durablement une identité ayant déjà consommé un trial.
     */
    TRIAL_IDENTITY_SECRET: z
        .string()
        .min(
            32,
            'TRIAL_IDENTITY_SECRET doit contenir au minimum 32 caractères',
        ),

    /*
     * Le bypass des rate limits est réservé aux parcours Playwright E2E.
     * Il reste désactivé par défaut et son activation est validée ci-dessous
     * contre NODE_ENV et le nom de la base MongoDB.
     */
    E2E_BYPASS_RATE_LIMITS: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),

    /*
     * Les outils qui détruisent volontairement des données de développement
     * restent désactivés par défaut, même lorsque NODE_ENV=development.
     */
    ALLOW_DEVELOPMENT_DATA_RESET: z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
}).superRefine((config, context) => {
    if (config.E2E_BYPASS_RATE_LIMITS) {
        if (config.NODE_ENV !== 'test') {
            context.addIssue({
                code: 'custom',
                path: ['E2E_BYPASS_RATE_LIMITS'],
                message:
                    'E2E_BYPASS_RATE_LIMITS ne peut être activé que lorsque NODE_ENV=test',
            });
        }

        if (!getMongoDatabaseName(config.MONGODB_URI).endsWith('_e2e_test')) {
            context.addIssue({
                code: 'custom',
                path: ['E2E_BYPASS_RATE_LIMITS'],
                message:
                    'E2E_BYPASS_RATE_LIMITS exige une base MongoDB se terminant par _e2e_test',
            });
        }
    }

    if (config.NODE_ENV !== 'production') {
        return;
    }

    const productionSensitiveFields = [
        'JWT_ACCESS_SECRET',
        'TRIAL_IDENTITY_SECRET',
        'SMTP_USER',
        'SMTP_PASSWORD',
    ];

    for (const field of productionSensitiveFields) {
        if (!isKnownPlaceholder(config[field])) {
            continue;
        }

        context.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} ne peut pas utiliser une valeur d’exemple en production`,
        });
    }

    /*
     * Les cookies d'authentification et les requêtes CORS avec credentials
     * exigent un frontend servi en HTTPS en production.
     */
    if (!config.CLIENT_URL.startsWith('https://')) {
        context.addIssue({
            code: 'custom',
            path: ['CLIENT_URL'],
            message: 'CLIENT_URL doit utiliser HTTPS en production',
        });
    }

    if (config.ALLOW_DEVELOPMENT_DATA_RESET) {
        context.addIssue({
            code: 'custom',
            path: ['ALLOW_DEVELOPMENT_DATA_RESET'],
            message: 'ALLOW_DEVELOPMENT_DATA_RESET doit rester désactivé en production',
        });
    }
});

const validateEnvironment = (input) => envSchema.safeParse(input);

// Valider les variables d'environnement et les transformer en types appropriés.
const validationResult = validateEnvironment(process.env);

if (!validationResult.success) {
    console.error(
        "La configuration de l'environnement est invalide.",
        z.flattenError(validationResult.error).fieldErrors,
    );

    process.exit(1);
}

// Geler l'objet pour éviter toute modification accidentelle.
const env = Object.freeze(validationResult.data);

export {
    env,
    envSchema,
    isKnownPlaceholder,
    validateEnvironment,
};
