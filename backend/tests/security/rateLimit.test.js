import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
    createApiRateLimiter,
    createForgotPasswordIpRateLimiter,
} from '../../config/rateLimit.config.js';
import {
    createRateLimitSkipPredicate,
} from '../../config/rateLimitRuntime.config.js';

const createTestApp = ({ skip } = {}) => {
    const app = express();

    const testRateLimiter = createApiRateLimiter({
        windowMs: 60 * 1000,
        limit: 2,
        skip,
    });

    app.use('/api', testRateLimiter);

    app.get('/api/test', (req, res) => {
        res.status(200).json({
            status: 'success',
        });
    });

    app.get('/public', (req, res) => {
        res.status(200).json({
            status: 'success',
        });
    });

    return app;
};

/**
 * Crée une application Express minimale pour tester uniquement
 * le limiter IP de forgot-password.
 *
 * On utilise une limite volontairement basse dans les tests afin
 * de vérifier le comportement sans reproduire les 10 requêtes
 * configurées pour l'application réelle.
 *
 * @returns {import('express').Express}
 */
const createForgotPasswordIpTestApp = () => {
    const app = express();

    const testRateLimiter =
        createForgotPasswordIpRateLimiter({
            windowMs: 60 * 1000,
            limit: 2,
        });

    app.post(
        '/forgot-password',
        testRateLimiter,
        (req, res) => {
            res.status(200).json({
                status: 'success',
            });
        },
    );

    return app;
};

describe('Rate limiter global', () => {
    it('ajoute les en-têtes modernes de limitation', async () => {
        const app = createTestApp();

        const response = await request(app).get('/api/test');

        expect(response.status).toBe(200);
        expect(response.headers.ratelimit).toBeDefined();
        expect(response.headers['ratelimit-policy']).toBeDefined();

        expect(response.headers['x-ratelimit-limit']).toBeUndefined();
        expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
        expect(response.headers['x-ratelimit-reset']).toBeUndefined();
    });

    it('renvoie une erreur 429 après dépassement du quota', async () => {
        const app = createTestApp();

        await request(app).get('/api/test');
        await request(app).get('/api/test');

        const response = await request(app).get('/api/test');

        expect(response.status).toBe(429);
        expect(response.body).toEqual({
            status: 'fail',
            message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        });
        expect(response.headers['retry-after']).toBeDefined();
    });

    it('bypasse le quota lorsque le contexte E2E autorisé est injecté', async () => {
        const app = createTestApp({
            skip: createRateLimitSkipPredicate({
                E2E_BYPASS_RATE_LIMITS: true,
            }),
        });

        expect((await request(app).get('/api/test')).status).toBe(200);
        expect((await request(app).get('/api/test')).status).toBe(200);
        expect((await request(app).get('/api/test')).status).toBe(200);
    });

    it('ne limite pas les routes situées hors de /api', async () => {
        const app = createTestApp();

        const response = await request(app).get('/public');

        expect(response.status).toBe(200);
        expect(response.headers.ratelimit).toBeUndefined();
        expect(response.headers['ratelimit-policy']).toBeUndefined();
    });
});

describe('Rate limiter IP forgot-password', () => {
    it('renvoie 429 après dépassement du quota pour une même IP', async () => {
        const app =
            createForgotPasswordIpTestApp();

        /*
         * Supertest envoie ces requêtes depuis la même origine locale.
         *
         * Avec une limite de 2 :
         * - requête 1 : autorisée ;
         * - requête 2 : autorisée ;
         * - requête 3 : refusée.
         */
        const firstResponse = await request(app)
            .post('/forgot-password');

        const secondResponse = await request(app)
            .post('/forgot-password');

        const thirdResponse = await request(app)
            .post('/forgot-password');

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);

        expect(thirdResponse.status).toBe(429);

        expect(thirdResponse.body).toEqual({
            status: 'fail',
            message:
                'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.',
        });

        /*
         * Le client doit recevoir l'information standard lui indiquant
         * qu'il doit attendre avant de tenter une nouvelle requête.
         */
        expect(
            thirdResponse.headers['retry-after'],
        ).toBeDefined();
    });
});