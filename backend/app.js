import express from 'express';
import { env } from './config/env.js';
import './config/applicationRolePermission.registry.js';
import './config/applicationGlobalPermission.registry.js';
import {
    mountApplicationRoutes,
} from './config/applicationRoutes.registry.js';
import { requestContext } from './middlewares/requestContext.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import helmet from 'helmet';
import { helmetOptions } from './config/helmet.config.js';
import cors from 'cors';
import { corsOptions } from './config/cors.config.js';
import { apiRateLimiter } from './config/rateLimit.config.js';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { authRouter } from './modules/auth/auth.routes.js';
import {
    commercialInvitationAcceptanceRouter,
} from './modules/commercialInvitation/commercialInvitation.routes.js';
import {
    platformRouter,
} from './modules/platform/platform.routes.js';
import {
    platformInvitationAcceptanceRouter,
} from './modules/platformInvitation/platformInvitation.routes.js';
import { fileRouter } from './modules/file/file.routes.js';
import {
    invitationAcceptanceRouter,
    workspaceInvitationRouter,
} from './modules/workspaceInvitation/workspaceInvitation.routes.js';
import { planRouter } from './modules/plan/plan.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { workspaceRouter } from './modules/workspace/workspace.routes.js';

import { healthRouter } from './routes/health.routes.js';
const app = express();
app.use(helmet(helmetOptions))
app.use(cors(corsOptions));// Placer avant les parsers et les routes pour que ce soit traité avec Cors
app.use(cookieParser())
app.use(compression());
app.use(requestContext)
if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api', apiRateLimiter);
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/platform', platformRouter);
app.use(
    '/api/platform-invitations',
    platformInvitationAcceptanceRouter,
);
app.use(
    '/api/commercial-invitations',
    commercialInvitationAcceptanceRouter,
);
app.use('/api/plans', planRouter);
/*
 * Les routers enfants utilisent mergeParams afin de recevoir workspaceId tout
 * en conservant une frontière multi-tenant explicite dans le chemin de montage.
 */
app.use(
    '/api/workspaces/:workspaceId/files',
    fileRouter,
);
app.use(
    '/api/workspaces/:workspaceId/invitations',
    workspaceInvitationRouter,
);
app.use('/api/invitations', invitationAcceptanceRouter);

/*
 * Les routes métier sont composées avant le router Workspace générique afin
 * qu'une application dérivée puisse monter ses domaines sans modifier ce
 * fichier central du Core.
 */
mountApplicationRoutes(app);
app.use('/api/workspaces', workspaceRouter);

app.use('/api/health', healthRouter);// Route pour vérifier l'état de santé de l'API
app.use(notFound);// Middleware pour gérer les routes non trouvées (404)
app.use(errorHandler);// Middleware pour gérer les erreurs

// Réduit les informations techniques exposées par l'API
// Ce réglage ne remplace pas les autres protections HTTP.
app.disable('x-powered-by');

// Pas de export.default pour permettre l'importation nommée dans server.js
export { app };
