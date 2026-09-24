import express from 'express';
import request from 'supertest';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createCommercialInvitationRateLimiter,
} from '../../config/commercialInvitationRateLimit.config.js';
import {
    createApiRateLimiter,
    createForgotPasswordEmailRateLimiter,
    createForgotPasswordIpRateLimiter,
    createLoginEmailRateLimiter,
    createLoginIpRateLimiter,
    createRegisterIpRateLimiter,
    createResetPasswordIpRateLimiter,
} from '../../config/rateLimit.config.js';
import {
    createRateLimitSkipPredicate,
} from '../../config/rateLimitRuntime.config.js';
import {
    createPlatformInvitationAcceptRateLimiter,
} from '../../config/platformInvitationRateLimit.config.js';
import {
    createWorkspaceInvitationAcceptRateLimiter,
} from '../../config/workspaceInvitationRateLimit.config.js';

const RATE_LIMIT_FACTORIES = [
    ['api', createApiRateLimiter],
    ['register', createRegisterIpRateLimiter],
    ['login ip', createLoginIpRateLimiter],
    ['login email', createLoginEmailRateLimiter],
    ['forgot-password ip', createForgotPasswordIpRateLimiter],
    ['forgot-password email', createForgotPasswordEmailRateLimiter],
    ['reset-password ip', createResetPasswordIpRateLimiter],
    ['workspace invitation', createWorkspaceInvitationAcceptRateLimiter],
    ['platform invitation', createPlatformInvitationAcceptRateLimiter],
    ['commercial invitation', createCommercialInvitationRateLimiter],
];

const createLimitedApp = ({ factory, skip }) => {
    const app = express();
    app.use(express.json());
    app.use(factory({
        windowMs: 60_000,
        limit: 1,
        skip,
    }));
    app.post('/', (_req, res) => {
        res.status(401).json({
            status: 'fail',
        });
    });

    return app;
};

describe('runtime E2E rate limit bypass', () => {
    it('conserve le comportement limité lorsque le bypass est désactivé', async () => {
        const app = createLimitedApp({
            factory: createApiRateLimiter,
            skip: createRateLimitSkipPredicate({
                E2E_BYPASS_RATE_LIMITS: false,
            }),
        });

        const first = await request(app).post('/');
        const second = await request(app).post('/');

        expect(first.status).toBe(401);
        expect(second.status).toBe(429);
    });

    it.each(RATE_LIMIT_FACTORIES)(
        'bypasse explicitement le limiter %s',
        async (_name, factory) => {
            const app = createLimitedApp({
                factory,
                skip: createRateLimitSkipPredicate({
                    E2E_BYPASS_RATE_LIMITS: true,
                }),
            });
            const payload = {
                email: 'e2e-rate-limit@example.test',
            };

            const first = await request(app)
                .post('/')
                .send(payload);
            const second = await request(app)
                .post('/')
                .send(payload);

            expect(first.status).toBe(401);
            expect(second.status).toBe(401);
        },
    );
});
