import {
    ipKeyGenerator,
    rateLimit,
} from 'express-rate-limit';

import { runtimeRateLimitSkip } from './rateLimitRuntime.config.js';


const PLATFORM_INVITATION_ACCEPT_WINDOW_MS = 15 * 60 * 1000;
const PLATFORM_INVITATION_ACCEPT_IP_MAX_REQUESTS = 10;

const PLATFORM_INVITATION_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de tentatives d’acceptation. Veuillez réessayer plus tard.',
};


const createPlatformInvitationAcceptRateLimiter = ({
    windowMs = PLATFORM_INVITATION_ACCEPT_WINDOW_MS,
    limit = PLATFORM_INVITATION_ACCEPT_IP_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) => rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: PLATFORM_INVITATION_RATE_LIMIT_MESSAGE,
});


const platformInvitationAcceptRateLimiter =
    createPlatformInvitationAcceptRateLimiter();


export {
    createPlatformInvitationAcceptRateLimiter,
    platformInvitationAcceptRateLimiter,
};
