import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforceWorkspaceAccessMode } from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    loadAuthorizedDossierContext,
} from '../dossier/dossierAccess.middleware.js';
import {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
} from '../dossier/dossierState.middleware.js';
import {
    enforceTechnicalSheetDossierOperational,
} from '../technicalSheet/technicalSheetAccess.middleware.js';
import {
    PROCESS_LIBRARY_PERMISSION,
} from './processLibrary.registry.js';
import {
    archive, create, get, history, list, publish, reactivate, update,
} from './processLibrary.controller.js';
import {
    createTemplateSchema,
    dossierKindParamsSchema,
    dossierTemplateParamsSchema,
    historyQuerySchema,
    listTemplatesQuerySchema,
    revisionMutationSchema,
    updateTemplateSchema,
    workspaceKindParamsSchema,
    workspaceTemplateParamsSchema,
} from './processLibrary.validation.js';

const makeRouter = (local) => {
    const router = Router({ mergeParams: true });
    const kindParams = local
        ? dossierKindParamsSchema
        : workspaceKindParamsSchema;
    const templateParams = local
        ? dossierTemplateParamsSchema
        : workspaceTemplateParamsSchema;
    const localContext = local
        ? [loadAuthorizedDossierContext]
        : [];
    const readChain = [
        loadWorkspaceContext,
        authorizePermission(PROCESS_LIBRARY_PERMISSION.READ),
        ...localContext,
        ...(local
            ? [enforceDossierStatePolicy(DOSSIER_STATE_POLICY.READ)]
            : []),
    ];
    const writeChain = [
        loadWorkspaceContext,
        authorizePermission(local
            ? PROCESS_LIBRARY_PERMISSION.MANAGE_LOCAL
            : PROCESS_LIBRARY_PERMISSION.MANAGE_WORKSPACE),
        enforceWorkspaceAccessMode(),
        ...localContext,
        ...(local ? [enforceTechnicalSheetDossierOperational] : []),
    ];

    router.get('/:kind', authenticate,
        validateRequest({ params: kindParams, query: listTemplatesQuerySchema }),
        ...readChain, list);
    router.get('/:kind/:templateId', authenticate,
        validateRequest({ params: templateParams }),
        ...readChain, get);
    router.get('/:kind/:templateId/revisions', authenticate,
        validateRequest({ params: templateParams, query: historyQuerySchema }),
        ...readChain, history);

    router.post('/:kind', authenticate,
        validateRequest({ params: kindParams, body: createTemplateSchema }),
        ...writeChain, create);
    router.put('/:kind/:templateId', authenticate,
        validateRequest({ params: templateParams, body: updateTemplateSchema }),
        ...writeChain, update);
    router.post('/:kind/:templateId/archive', authenticate,
        validateRequest({ params: templateParams, body: revisionMutationSchema }),
        ...writeChain, archive);
    router.post('/:kind/:templateId/reactivate', authenticate,
        validateRequest({ params: templateParams, body: revisionMutationSchema }),
        ...writeChain, reactivate);
    if (local) {
        router.post('/:kind/:templateId/publish', authenticate,
            validateRequest({
                params: templateParams,
                body: revisionMutationSchema,
            }),
            ...writeChain,
            authorizePermission(PROCESS_LIBRARY_PERMISSION.PUBLISH),
            authorizePermission(PROCESS_LIBRARY_PERMISSION.MANAGE_WORKSPACE),
            publish);
    }
    return router;
};

const processLibraryWorkspaceRouter = makeRouter(false);
const processLibraryDossierRouter = makeRouter(true);

export { processLibraryDossierRouter, processLibraryWorkspaceRouter };
