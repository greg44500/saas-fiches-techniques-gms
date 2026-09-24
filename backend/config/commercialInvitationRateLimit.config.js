import {
    ipKeyGenerator,
    rateLimit,
} from 'express-rate-limit';

import { runtimeRateLimitSkip } from './rateLimitRuntime.config.js';

const COMMERCIAL_INVITATION_WINDOW_MS = 15 * 60 * 1000;
const COMMERCIAL_INVITATION_IP_MAX_REQUESTS = 20;

const COMMERCIAL_INVITATION_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de tentatives sur cette invitation. Veuillez réessayer plus tard.',
};

/**
 * Les endpoints preview/accept manipulent un secret bearer envoyé par email.
 * Le rate limit par IP réduit les tentatives automatisées sans utiliser le
 * token lui-même comme clé et donc sans l'inscrire dans l'état du limiter.
 */
const createCommercialInvitationRateLimiter = ({
    windowMs = COMMERCIAL_INVITATION_WINDOW_MS,
    limit = COMMERCIAL_INVITATION_IP_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) => rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: COMMERCIAL_INVITATION_RATE_LIMIT_MESSAGE,
});

const commercialInvitationRateLimiter =
    createCommercialInvitationRateLimiter();

export {
    commercialInvitationRateLimiter,
    createCommercialInvitationRateLimiter,
};
