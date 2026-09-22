import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import {
    loadWorkspaceContext,
} from '../../middlewares/loadWorkspaceContext.js';
import {
    validateRequest,
} from '../../middlewares/validateRequest.js';
import {
    activity,
    create,
    getById,
    grantAccess,
    list,
    listAccessGrants,
    metadata,
    revokeAccess,
    update,
    updateStatus,
} from './dossier.controller.js';
import {
    loadAuthorizedDossierContext,
} from './dossierAccess.middleware.js';
import {
    dossierAccessListQuerySchema,
    dossierAccessParamsSchema,
    emptyBodySchema,
} from './dossierAccess.validation.js';
import {
    DOSSIER_PERMISSION,
} from './dossierPermission.registry.js';
import {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
} from './dossierState.middleware.js';
import {
    createDossierSchema,
    dossierActivityQuerySchema,
    dossierIdParamsSchema,
    dossierListQuerySchema,
    updateDossierSchema,
    updateDossierStatusSchema,
    workspaceIdParamsSchema,
} from './dossier.validation.js';


const dossierRouter = Router({
    mergeParams: true,
});

dossierRouter.get(
    '/metadata',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.READ,
    ),
    metadata,
);

dossierRouter.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: dossierListQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.READ,
    ),
    list,
);

dossierRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: createDossierSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.CREATE,
    ),
    enforceWorkspaceAccessMode(),
    create,
);

dossierRouter.get(
    '/:dossierId',
    authenticate,
    validateRequest({
        params: dossierIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.READ,
    ),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    getById,
);

dossierRouter.get(
    '/:dossierId/activity',
    authenticate,
    validateRequest({
        params: dossierIdParamsSchema,
        query: dossierActivityQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.READ,
    ),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ_ACTIVITY,
    ),
    activity,
);

dossierRouter.patch(
    '/:dossierId',
    authenticate,
    validateRequest({
        params: dossierIdParamsSchema,
        body: updateDossierSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.UPDATE,
    ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.UPDATE,
    ),
    update,
);

dossierRouter.patch(
    '/:dossierId/status',
    authenticate,
    validateRequest({
        params: dossierIdParamsSchema,
        body: updateDossierStatusSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.LIFECYCLE_UPDATE,
    ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    updateStatus,
);

dossierRouter.get(
    '/:dossierId/access-grants',
    authenticate,
    validateRequest({
        params: dossierIdParamsSchema,
        query: dossierAccessListQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.ACCESS_READ,
    ),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.GRANT_READ,
    ),
    listAccessGrants,
);

dossierRouter.put(
    '/:dossierId/access-grants/:membershipId',
    authenticate,
    validateRequest({
        params: dossierAccessParamsSchema,
        body: emptyBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.ACCESS_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.GRANT_MANAGE,
    ),
    grantAccess,
);

dossierRouter.delete(
    '/:dossierId/access-grants/:membershipId',
    authenticate,
    validateRequest({
        params: dossierAccessParamsSchema,
        body: emptyBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        DOSSIER_PERMISSION.ACCESS_MANAGE,
    ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.GRANT_MANAGE,
    ),
    revokeAccess,
);


export { dossierRouter };
