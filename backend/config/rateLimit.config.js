import { createHash } from 'node:crypto';

import {
    ipKeyGenerator,
    rateLimit,
} from 'express-rate-limit';

import { canonicalizeEmail } from '../utils/canonicalizeEmail.js';
import { runtimeRateLimitSkip } from './rateLimitRuntime.config.js';


/*
 * Rate limit général de l'API.
 *
 * Il constitue une première protection contre les abus globaux,
 * mais il n'est volontairement pas suffisant pour les endpoints
 * sensibles comme login ou forgot-password.
 */
const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const API_RATE_LIMIT_MAX_REQUESTS = 300;


/*
 * L'inscription publique peut déclencher un hash de mot de passe puis des
 * écritures transactionnelles. La limite IP doit compter les succès afin de
 * freiner la création massive de comptes, pas seulement les erreurs.
 */
const REGISTER_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_IP_MAX_REQUESTS = 10;

const REGISTER_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de tentatives d’inscription. Veuillez réessayer plus tard.',
};


/*
 * Le login doit résister aux tentatives répétées sans introduire de verrouillage
 * de compte exploitable en déni de service. Deux barrières indépendantes sont
 * utilisées : origine réseau et identité pseudonymisée.
 *
 * Les requêtes réussies ne sont pas conservées dans les compteurs afin de ne
 * pas pénaliser l'usage normal.
 */
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_IP_MAX_FAILED_REQUESTS = 50;
const LOGIN_EMAIL_MAX_FAILED_REQUESTS = 10;

const LOGIN_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
};


/*
 * forgot-password est beaucoup plus sensible qu'une route API classique :
 * une requête peut provoquer des accès MongoDB, la création d'un token
 * et l'envoi d'un email.
 *
 * On applique donc des seuils plus restrictifs.
 */
const FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS =
    15 * 60 * 1000;

const FORGOT_PASSWORD_IP_MAX_REQUESTS = 10;

const FORGOT_PASSWORD_EMAIL_MAX_REQUESTS = 3;


const FORGOT_PASSWORD_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de demandes de réinitialisation. Veuillez réessayer plus tard.',
};


/*
 * reset-password reste une route publique portant un secret temporaire.
 * La forte entropie du token protège du brute force ; cette limite IP vise
 * surtout l'abus volumétrique du endpoint et de ses accès MongoDB.
 */
const RESET_PASSWORD_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RESET_PASSWORD_IP_MAX_REQUESTS = 10;

const RESET_PASSWORD_RATE_LIMIT_MESSAGE = {
    status: 'fail',
    message:
        'Trop de tentatives de réinitialisation. Veuillez réessayer plus tard.',
};


/**
 * Crée le rate limiter général de l'API.
 *
 * La factory reste exportée afin de pouvoir créer,
 * notamment dans les tests, une instance avec des limites réduites
 * sans modifier la configuration utilisée en production.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createApiRateLimiter = ({
    windowMs = API_RATE_LIMIT_WINDOW_MS,
    limit = API_RATE_LIMIT_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        message: {
            status: 'fail',
            message:
                'Trop de requêtes. Veuillez réessayer plus tard.',
        },
    });


/**
 * Construit une clé non sensible pour limiter les requêtes visant une même
 * adresse email, sans jamais consulter la base utilisateurs.
 *
 * L'email est canonisé puis transformé en SHA-256. L'existence du compte ne
 * participe donc jamais au calcul de la clé et ne peut pas être révélée.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
const buildEmailRateLimitKey = (req) => {
    const email = req.body?.email;

    if (
        typeof email !== 'string'
        || email.trim() === ''
    ) {
        return `ip:${ipKeyGenerator(req.ip)}`;
    }

    const emailCanonical =
        canonicalizeEmail(email);

    const emailHash = createHash('sha256')
        .update(emailCanonical)
        .digest('hex');

    return `email:${emailHash}`;
};


/**
 * Crée le rate limiter IP dédié à l'inscription publique.
 *
 * Toutes les requêtes sont comptées, y compris les succès, puisque l'objectif
 * est d'empêcher une origine de créer un volume anormal de comptes valides.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createRegisterIpRateLimiter = ({
    windowMs = REGISTER_RATE_LIMIT_WINDOW_MS,
    limit = REGISTER_IP_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator: (req) =>
            ipKeyGenerator(req.ip),

        message:
            REGISTER_RATE_LIMIT_MESSAGE,
    });


/**
 * Crée le rate limiter IP dédié au login.
 *
 * Cette barrière limite une origine réseau sans bloquer durablement un compte.
 * Les succès sont ignorés par le compteur.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createLoginIpRateLimiter = ({
    windowMs = LOGIN_RATE_LIMIT_WINDOW_MS,
    limit = LOGIN_IP_MAX_FAILED_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator: (req) =>
            ipKeyGenerator(req.ip),

        skipSuccessfulRequests: true,

        message:
            LOGIN_RATE_LIMIT_MESSAGE,
    });


/**
 * Crée le rate limiter dédié à une même identité de login.
 *
 * La clé est pseudonymisée et calculée de façon identique que le compte existe
 * ou non. Cette propriété évite toute fuite d'information utilisateur.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createLoginEmailRateLimiter = ({
    windowMs = LOGIN_RATE_LIMIT_WINDOW_MS,
    limit = LOGIN_EMAIL_MAX_FAILED_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator:
            buildEmailRateLimitKey,

        skipSuccessfulRequests: true,

        message:
            LOGIN_RATE_LIMIT_MESSAGE,
    });


/**
 * Crée le rate limiter IP dédié à forgot-password.
 *
 * Cette première barrière limite le nombre total de demandes
 * provenant d'une même origine réseau, indépendamment des emails
 * fournis dans les différentes requêtes.
 *
 * ipKeyGenerator() est utilisé plutôt que req.ip directement
 * afin de conserver la normalisation IPv6 prévue par
 * express-rate-limit.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createForgotPasswordIpRateLimiter = ({
    windowMs = FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = FORGOT_PASSWORD_IP_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator: (req) =>
            ipKeyGenerator(req.ip),

        message:
            FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });


/**
 * Crée le rate limiter dédié à une même adresse email
 * sur le workflow forgot-password.
 *
 * Cette protection est indépendante de l'existence réelle
 * du compte : la clé est calculée uniquement à partir
 * de la donnée reçue dans la requête.
 *
 * Cette propriété est importante afin que le rate limiter
 * ne révèle jamais si une adresse correspond à un User.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createForgotPasswordEmailRateLimiter = ({
    windowMs = FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = FORGOT_PASSWORD_EMAIL_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator:
            buildEmailRateLimitKey,

        message:
            FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
    });


/**
 * Crée le rate limiter IP dédié à la consommation d'un token de reset.
 *
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.limit]
 * @param {(req: import('express').Request) => boolean} [options.skip]
 * @returns {import('express').RequestHandler}
 */
const createResetPasswordIpRateLimiter = ({
    windowMs = RESET_PASSWORD_RATE_LIMIT_WINDOW_MS,
    limit = RESET_PASSWORD_IP_MAX_REQUESTS,
    skip = runtimeRateLimitSkip,
} = {}) =>
    rateLimit({
        windowMs,
        limit,
        skip,

        standardHeaders: 'draft-8',
        legacyHeaders: false,

        keyGenerator: (req) =>
            ipKeyGenerator(req.ip),

        message:
            RESET_PASSWORD_RATE_LIMIT_MESSAGE,
    });


const apiRateLimiter =
    createApiRateLimiter();

const registerIpRateLimiter =
    createRegisterIpRateLimiter();

const loginIpRateLimiter =
    createLoginIpRateLimiter();

const loginEmailRateLimiter =
    createLoginEmailRateLimiter();

const forgotPasswordIpRateLimiter =
    createForgotPasswordIpRateLimiter();

const forgotPasswordEmailRateLimiter =
    createForgotPasswordEmailRateLimiter();

const resetPasswordIpRateLimiter =
    createResetPasswordIpRateLimiter();


export {
    apiRateLimiter,

    forgotPasswordEmailRateLimiter,
    forgotPasswordIpRateLimiter,
    loginEmailRateLimiter,
    loginIpRateLimiter,
    registerIpRateLimiter,
    resetPasswordIpRateLimiter,

    buildEmailRateLimitKey,
    createApiRateLimiter,
    createForgotPasswordEmailRateLimiter,
    createForgotPasswordIpRateLimiter,
    createLoginEmailRateLimiter,
    createLoginIpRateLimiter,
    createRegisterIpRateLimiter,
    createResetPasswordIpRateLimiter,
};