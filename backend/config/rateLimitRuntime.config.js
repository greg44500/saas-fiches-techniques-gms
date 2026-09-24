import { env } from './env.js';

/**
 * Crée le predicate partagé par les rate limiters runtime.
 *
 * Le flag est validé au démarrage : il ne peut être vrai que pour NODE_ENV=test
 * avec une base MongoDB explicitement suffixée _e2e_test.
 *
 * L'injection du config permet aux tests de vérifier le comportement sans
 * modifier l'environnement global du processus Vitest.
 *
 * @param {{ E2E_BYPASS_RATE_LIMITS?: boolean }} [config]
 * @returns {(req: import('express').Request) => boolean}
 */
const createRateLimitSkipPredicate = (config = env) => (
    () => config.E2E_BYPASS_RATE_LIMITS === true
);

const runtimeRateLimitSkip =
    createRateLimitSkipPredicate();

export {
    createRateLimitSkipPredicate,
    runtimeRateLimitSkip,
};
