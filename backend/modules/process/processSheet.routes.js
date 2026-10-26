import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforceWorkspaceAccessMode } from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { loadAuthorizedDossierContext } from '../dossier/dossierAccess.middleware.js';
import {
    DOSSIER_STATE_POLICY, enforceDossierStatePolicy,
} from '../dossier/dossierState.middleware.js';
import {
    enforceTechnicalSheetDossierOperational,
} from '../technicalSheet/technicalSheetAccess.middleware.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from '../technicalSheet/technicalSheetPermission.registry.js';
import { PROCESS_SHEET_PERMISSION } from './processSheetPermission.registry.js';
import { create, eligible, get, list } from './processSheet.controller.js';
import {
    dossierParamsSchema, eligibleTechnicalSheetQuerySchema,
    processCreateSchema, processListQuerySchema, processParamsSchema,
} from './processSheet.validation.js';

const processSheetRouter = Router({ mergeParams: true });

const readChain = [
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.READ),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(DOSSIER_STATE_POLICY.READ),
];
const createChain = [
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.CREATE),
    authorizePermission(TECHNICAL_SHEET_PERMISSION.READ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
];

processSheetRouter.get('/',
    authenticate,
    validateRequest({ params: dossierParamsSchema, query: processListQuerySchema }),
    ...readChain, list);
processSheetRouter.get('/eligible-technical-sheets',
    authenticate,
    validateRequest({
        params: dossierParamsSchema, query: eligibleTechnicalSheetQuerySchema,
    }),
    ...readChain,
    authorizePermission(TECHNICAL_SHEET_PERMISSION.READ),
    eligible);
processSheetRouter.post('/',
    authenticate,
    validateRequest({ params: dossierParamsSchema, body: processCreateSchema }),
    ...createChain, create);
processSheetRouter.get('/:processSheetId',
    authenticate,
    validateRequest({ params: processParamsSchema }),
    ...readChain, get);

export { processSheetRouter };
