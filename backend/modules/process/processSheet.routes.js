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
import { processSheetCompositionRouter } from './processSheetComposition.routes.js';
import {
    create, eligible, get, list, saveDraft, validate,
    getReconciliation, applyReconciliation,
} from './processSheet.controller.js';
import {
    dossierParamsSchema, eligibleTechnicalSheetQuerySchema,
    processCreateSchema, processListQuerySchema, processParamsSchema,
    saveProcessSheetDraftSchema, validateProcessSheetSchema,
    reconcileProcessSheetSchema,
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
processSheetRouter.put('/:processSheetId/draft',
    authenticate,
    validateRequest({
        params: processParamsSchema, body: saveProcessSheetDraftSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.EDIT),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    saveDraft);
processSheetRouter.post('/:processSheetId/validate',
    authenticate,
    validateRequest({
        params: processParamsSchema, body: validateProcessSheetSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.VALIDATE),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    validate);
processSheetRouter.get('/:processSheetId/composition-review',
    authenticate,
    validateRequest({ params: processParamsSchema }),
    ...readChain, getReconciliation);
processSheetRouter.post('/:processSheetId/reconcile',
    authenticate,
    validateRequest({ params: processParamsSchema, body: reconcileProcessSheetSchema }),
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.EDIT),
    authorizePermission(PROCESS_SHEET_PERMISSION.VALIDATE),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    applyReconciliation);
processSheetRouter.get('/:processSheetId',
    authenticate,
    validateRequest({ params: processParamsSchema }),
    ...readChain, get);

// Backward-compatible composition endpoint under the same process route
// mount. Register after exact /eligible and /:processSheetId handlers.
processSheetRouter.use(processSheetCompositionRouter);

// Keep Core error handling unchanged. Only declared M-006 business conflicts
// expose a stable code for a contextual UI action, never a technical exception.
processSheetRouter.use((error, _req, res, next) => {
    if (error?.isOperational
        && typeof error.code === 'string'
        && error.code.startsWith('PROCESS_SHEET_')) {
        return res.status(error.statusCode).json({
            status: 'fail', code: error.code, message: error.message,
        });
    }
    return next(error);
});

export { processSheetRouter };
