import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';
import {
    loadWorkspaceContext,
} from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    loadAuthorizedDossierContext,
} from '../dossier/dossierAccess.middleware.js';
import {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
} from '../dossier/dossierState.middleware.js';
import {
    PROCESS_SHEET_PERMISSION,
} from './processSheetPermission.registry.js';
import {
    readComposition,
} from './processSheetComposition.controller.js';
import {
    processSheetCompositionParamsSchema,
} from './processSheetComposition.validation.js';

const processSheetCompositionRouter = Router({ mergeParams: true });

processSheetCompositionRouter.get(
    '/technical-sheets/:technicalSheetId/composition',
    authenticate,
    validateRequest({ params: processSheetCompositionParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.READ),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(DOSSIER_STATE_POLICY.READ),
    readComposition,
);

export { processSheetCompositionRouter };
