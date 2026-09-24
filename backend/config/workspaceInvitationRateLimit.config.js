import {
    ipKeyGenerator,
    rateLimit,
} from 'express-rate-limit';

import { runtimeRateLimitSkip } from './rateLimitRuntime.config.js';


const WORKSPACE_INVITATION_ACCEPT_WINDOW_MS = 15 * 60 * 1000;
const WORKSPACE_INVITATION_ACCEPT_IP_MAX_REQUESTS = 10;

const WORKSPACE_INVITATION_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de tentatives d’acceptation. Veuillez réessayer plus tard.',
};


/**
 * Les routes d'acceptation manipulent un secret bearer envoyé par email.
 * La clé reste strictement réseau : le token n'entre jamais dans l'état du
 * limiter et ne peut donc pas être persisté indirectement par cette protection.
 */
const createWorkspaceInvitationAcceptRateLimiter = ({
    windowMs = WORKSPACE_INVITATION_ACCEPT_WINDOW_MS,
    limit = WORKSPACE_INVITATION_ACCEPT_IP_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) => rateLimit({
    windowMs,
    limit,
    skip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    message: WORKSPACE_INVITATION_RATE_LIMIT_MESSAGE,
});


const workspaceInvitationAcceptRateLimiter =
    createWorkspaceInvitationAcceptRateLimiter();


export {
    createWorkspaceInvitationAcceptRateLimiter,
    workspaceInvitationAcceptRateLimiter,
};
