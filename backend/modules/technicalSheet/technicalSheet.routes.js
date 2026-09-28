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
    loadAuthorizedDossierContext,
} from '../dossier/dossierAccess.middleware.js';
import {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
} from '../dossier/dossierState.middleware.js';
import {
    archive,
    businessSettings,
    capacity,
    copy,
    create,
    getById,
    getDossierSettings,
    getDraft,
    history,
    historyById,
    list,
    metadata,
    purge,
    purgeWorkspaceTrash,
    reactivate,
    remove,
    restore,
    saveDraft,
    selectSupplierArticle,
    startDraft,
    trash,
    update,
    updateBusinessSettings,
    updateDossierSettings,
    validate,
    valuate,
} from './technicalSheet.controller.js';
import {
    enforceTechnicalSheetDossierOperational,
} from './technicalSheetAccess.middleware.js';
import {
    requireWorkspaceOwner,
} from './technicalSheetOwner.middleware.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from './technicalSheetPermission.registry.js';
import {
    copyTechnicalSheetSchema,
    createDraftFromValidationSchema,
    createTechnicalSheetSchema,
    dossierTechnicalSheetSettingsSchema,
    paginationQuerySchema,
    purgeTechnicalSheetSchema,
    purgeWorkspaceTrashSchema,
    revisionMutationSchema,
    saveTechnicalSheetDraftSchema,
    selectSupplierArticleSchema,
    technicalSheetDossierParamsSchema,
    technicalSheetListQuerySchema,
    technicalSheetParamsSchema,
    technicalSheetValidationParamsSchema,
    technicalSheetWorkspaceParamsSchema,
    trashRetentionSchema,
    updateTechnicalSheetSchema,
    validateTechnicalSheetSchema,
    valuateTechnicalSheetSchema,
} from './technicalSheet.validation.js';

const technicalSheetDossierRouter =
    Router({ mergeParams: true });
const technicalSheetWorkspaceRouter =
    Router({ mergeParams: true });
const workspaceBusinessSettingsRouter =
    Router({ mergeParams: true });

const dossierReadChain = [
    authenticate,
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.READ,
    ),
    loadAuthorizedDossierContext,
];

technicalSheetDossierRouter.get(
    '/metadata',
    authenticate,
    validateRequest({
        params:
            technicalSheetDossierParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.READ,
    ),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    metadata,
);

technicalSheetDossierRouter.get(
    '/settings',
    authenticate,
    validateRequest({
        params:
            technicalSheetDossierParamsSchema,
    }),
    ...dossierReadChain.slice(1),
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    getDossierSettings,
);

technicalSheetDossierRouter.put(
    '/settings',
    authenticate,
    validateRequest({
        params:
            technicalSheetDossierParamsSchema,
        body:
            dossierTechnicalSheetSettingsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION
            .SETTINGS_MANAGE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.UPDATE,
    ),
    updateDossierSettings,
);

technicalSheetDossierRouter.get(
    '/',
    authenticate,
    validateRequest({
        params:
            technicalSheetDossierParamsSchema,
        query:
            technicalSheetListQuerySchema,
    }),
    ...dossierReadChain.slice(1),
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    list,
);

technicalSheetDossierRouter.post(
    '/',
    authenticate,
    validateRequest({
        params:
            technicalSheetDossierParamsSchema,
        body:
            createTechnicalSheetSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.CREATE,
    ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    create,
);

technicalSheetDossierRouter.get(
    '/:technicalSheetId',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
    }),
    ...dossierReadChain.slice(1),
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    getById,
);

technicalSheetDossierRouter.patch(
    '/:technicalSheetId',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            updateTechnicalSheetSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.UPDATE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    update,
);

technicalSheetDossierRouter.get(
    '/:technicalSheetId/draft',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
    }),
    ...dossierReadChain.slice(1),
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    getDraft,
);

technicalSheetDossierRouter.post(
    '/:technicalSheetId/draft',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            createDraftFromValidationSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.UPDATE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    startDraft,
);

technicalSheetDossierRouter.put(
    '/:technicalSheetId/draft',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            saveTechnicalSheetDraftSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.UPDATE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    saveDraft,
);

technicalSheetDossierRouter.patch(
    '/:technicalSheetId/draft/sourcing',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            selectSupplierArticleSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION
            .SOURCING_MANAGE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    selectSupplierArticle,
);

technicalSheetDossierRouter.post(
    '/:technicalSheetId/valuate',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            valuateTechnicalSheetSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION
            .VALUATION_MANAGE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    valuate,
);

technicalSheetDossierRouter.post(
    '/:technicalSheetId/validate',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            validateTechnicalSheetSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.VALIDATE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    loadAuthorizedDossierContext,
    enforceTechnicalSheetDossierOperational,
    validate,
);

technicalSheetDossierRouter.get(
    '/:technicalSheetId/history',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        query:
            paginationQuerySchema,
    }),
    ...dossierReadChain.slice(1),
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    history,
);

technicalSheetDossierRouter.get(
    '/:technicalSheetId/history/:validationId',
    authenticate,
    validateRequest({
        params:
            technicalSheetValidationParamsSchema,
    }),
    ...dossierReadChain.slice(1),
    enforceDossierStatePolicy(
        DOSSIER_STATE_POLICY.READ,
    ),
    historyById,
);

const lifecycleRoute = ({
    path,
    permission,
    controller,
    ownerOnly = false,
    bodySchema =
        revisionMutationSchema,
}) => {
    technicalSheetDossierRouter.post(
        path,
        authenticate,
        validateRequest({
            params:
                technicalSheetParamsSchema,
            body: bodySchema,
        }),
        loadWorkspaceContext,
        authorizePermission(permission),
        enforceWorkspaceAccessMode({
            allowDuringRemediation: true,
        }),
        loadAuthorizedDossierContext,
        ...(ownerOnly
            ? [requireWorkspaceOwner]
            : []),
        controller,
    );
};

lifecycleRoute({
    path: '/:technicalSheetId/archive',
    permission:
        TECHNICAL_SHEET_PERMISSION
            .LIFECYCLE_MANAGE,
    controller: archive,
});
lifecycleRoute({
    path: '/:technicalSheetId/reactivate',
    permission:
        TECHNICAL_SHEET_PERMISSION
            .LIFECYCLE_MANAGE,
    controller: reactivate,
});
lifecycleRoute({
    path: '/:technicalSheetId/delete',
    permission:
        TECHNICAL_SHEET_PERMISSION.DELETE,
    controller: remove,
});
lifecycleRoute({
    path: '/:technicalSheetId/restore',
    permission:
        TECHNICAL_SHEET_PERMISSION.RESTORE,
    controller: restore,
});
lifecycleRoute({
    path: '/:technicalSheetId/purge',
    permission:
        TECHNICAL_SHEET_PERMISSION.PURGE,
    controller: purge,
    ownerOnly: true,
    bodySchema:
        purgeTechnicalSheetSchema,
});

technicalSheetDossierRouter.post(
    '/:technicalSheetId/copy',
    authenticate,
    validateRequest({
        params:
            technicalSheetParamsSchema,
        body:
            copyTechnicalSheetSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.COPY,
    ),
    enforceWorkspaceAccessMode(),
    loadAuthorizedDossierContext,
    copy,
);

technicalSheetWorkspaceRouter.get(
    '/capacity',
    authenticate,
    validateRequest({
        params:
            technicalSheetWorkspaceParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.READ,
    ),
    capacity,
);

technicalSheetWorkspaceRouter.get(
    '/trash',
    authenticate,
    validateRequest({
        params:
            technicalSheetWorkspaceParamsSchema,
        query:
            paginationQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.READ,
    ),
    requireWorkspaceOwner,
    trash,
);

technicalSheetWorkspaceRouter.post(
    '/trash/purge',
    authenticate,
    validateRequest({
        params:
            technicalSheetWorkspaceParamsSchema,
        body:
            purgeWorkspaceTrashSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.PURGE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    requireWorkspaceOwner,
    purgeWorkspaceTrash,
);

workspaceBusinessSettingsRouter.get(
    '/',
    authenticate,
    validateRequest({
        params:
            technicalSheetWorkspaceParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION.READ,
    ),
    businessSettings,
);

workspaceBusinessSettingsRouter.put(
    '/trash-retention',
    authenticate,
    validateRequest({
        params:
            technicalSheetWorkspaceParamsSchema,
        body:
            trashRetentionSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        TECHNICAL_SHEET_PERMISSION
            .SETTINGS_MANAGE,
    ),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    requireWorkspaceOwner,
    updateBusinessSettings,
);

export {
    technicalSheetDossierRouter,
    technicalSheetWorkspaceRouter,
    workspaceBusinessSettingsRouter,
};
