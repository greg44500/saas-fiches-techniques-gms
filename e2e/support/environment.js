const E2E_BACKEND_ORIGIN = 'http://127.0.0.1:5100';
const E2E_FRONTEND_ORIGIN = 'http://127.0.0.1:5174';
const DEFAULT_E2E_MONGODB_URI =
  'mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_e2e_test?replicaSet=rs0';

const E2E_FOUNDER = Object.freeze({
  firstName: 'E2E',
  lastName: 'Founder',
  email: 'founder.e2e@example.test',
  password: 'Cobalt river quartz 2026 # Founder',
});

function getDatabaseName(mongodbUri) {
  try {
    const parsedUri = new URL(mongodbUri);
    return decodeURIComponent(parsedUri.pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
}

/**
 * Interdit tout nettoyage destructif hors d'une base nommée explicitement E2E.
 * Le suffixe est volontairement plus strict que le simple `_test` utilisé par
 * Vitest afin qu'une commande Playwright ne puisse jamais viser sa base.
 */
function assertSafeE2eMongoUri(mongodbUri) {
  const databaseName = getDatabaseName(mongodbUri);

  if (!databaseName.endsWith('_e2e_test')) {
    throw new Error(
      'Sécurité E2E : la base MongoDB doit se terminer par `_e2e_test`.',
    );
  }

  return mongodbUri;
}

function getE2eMongoUri() {
  return assertSafeE2eMongoUri(
    process.env.E2E_MONGODB_URI?.trim() || DEFAULT_E2E_MONGODB_URI,
  );
}

function getE2eBackendEnvironment() {
  return {
    NODE_ENV: 'test',
    PORT: '5100',
    CLIENT_URL: E2E_FRONTEND_ORIGIN,
    MONGODB_URI: getE2eMongoUri(),
    JWT_ACCESS_SECRET: 'e2e_test_jwt_access_secret_0123456789abcdef',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_ACCESS_ISSUER: 'saas-core-api',
    JWT_ACCESS_AUDIENCE: 'saas-core-api',
    REFRESH_TOKEN_EXPIRES_IN_DAYS: '7',
    PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES: '15',
    WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS: '24',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    SMTP_SECURE: 'false',
    SMTP_USER: 'e2e-user',
    SMTP_PASSWORD: 'e2e-password',
    SMTP_FROM_EMAIL: 'no-reply@example.test',
    SMTP_FROM_NAME: 'SAAS Core E2E',
    UPLOAD_MAX_FILE_SIZE_BYTES: '5242880',
    FILE_RETENTION_DAYS: '30',
    FILE_STORAGE_PROVIDER: 'local',
    LOCAL_STORAGE_ROOT_DIR: 'uploads/e2e/files',
    UPLOAD_TEMP_DIR: 'uploads/e2e/tmp',
    CLAMAV_BINARY_PATH: 'clamscan',
    CLAMAV_SCAN_TIMEOUT_MS: '30000',
    UPLOAD_TEMP_FILE_MAX_AGE_MINUTES: '60',
    TRIAL_IDENTITY_SECRET: 'e2e_test_trial_identity_secret_0123456789abcdef',
    ALLOW_DEVELOPMENT_DATA_RESET: 'false',
  };
}

function applyE2eBackendEnvironment() {
  const environment = getE2eBackendEnvironment();

  for (const [key, value] of Object.entries(environment)) {
    process.env[key] = value;
  }

  return environment;
}

export {
  DEFAULT_E2E_MONGODB_URI,
  E2E_BACKEND_ORIGIN,
  E2E_FOUNDER,
  E2E_FRONTEND_ORIGIN,
  applyE2eBackendEnvironment,
  assertSafeE2eMongoUri,
  getDatabaseName,
  getE2eBackendEnvironment,
  getE2eMongoUri,
};
