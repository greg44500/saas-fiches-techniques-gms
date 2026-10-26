import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforceWorkspaceAccessMode } from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { TECHNICAL_SHEET_PERMISSION } from './technicalSheetPermission.registry.js';
import {
    archive, create, list, options, reactivate, remove, rename, suggestions,
} from './technicalSheetRange.controller.js';
import {
    createRangeSchema,
    deleteRangeSchema,
    rangeListQuerySchema,
    rangeOptionsQuerySchema,
    rangeParamsSchema,
    rangeRevisionSchema,
    rangeSuggestionsQuerySchema,
    updateRangeSchema,
    workspaceRangeParamsSchema,
} from './technicalSheetRange.validation.js';

const technicalSheetRangeRouter = Router({ mergeParams: true });

technicalSheetRangeRouter.get(
    '/',
    authenticate,
    validateRequest({ params: workspaceRangeParamsSchema, query: rangeListQuerySchema }),
    loadWorkspaceContext,
    authorizePermission(TECHNICAL_SHEET_PERMISSION.READ),
    list,
);

technicalSheetRangeRouter.get(
    '/options',
    authenticate,
    validateRequest({ params: workspaceRangeParamsSchema, query: rangeOptionsQuerySchema }),
    loadWorkspaceContext,
    authorizePermission(TECHNICAL_SHEET_PERMISSION.READ),
    options,
);

technicalSheetRangeRouter.get(
    '/suggestions',
    authenticate,
    validateRequest({ params: workspaceRangeParamsSchema, query: rangeSuggestionsQuerySchema }),
    loadWorkspaceContext,
    authorizePermission(TECHNICAL_SHEET_PERMISSION.READ),
    suggestions,
);

const writeChain = [
    loadWorkspaceContext,
    authorizePermission(TECHNICAL_SHEET_PERMISSION.RANGE_MANAGE),
    enforceWorkspaceAccessMode(),
];

technicalSheetRangeRouter.post(
    '/',
    authenticate,
    validateRequest({ params: workspaceRangeParamsSchema, body: createRangeSchema }),
    ...writeChain,
    create,
);
technicalSheetRangeRouter.patch(
    '/:rangeId',
    authenticate,
    validateRequest({ params: rangeParamsSchema, body: updateRangeSchema }),
    ...writeChain,
    rename,
);
technicalSheetRangeRouter.post(
    '/:rangeId/archive',
    authenticate,
    validateRequest({ params: rangeParamsSchema, body: rangeRevisionSchema }),
    ...writeChain,
    archive,
);
technicalSheetRangeRouter.post(
    '/:rangeId/reactivate',
    authenticate,
    validateRequest({ params: rangeParamsSchema, body: rangeRevisionSchema }),
    ...writeChain,
    reactivate,
);
technicalSheetRangeRouter.delete(
    '/:rangeId',
    authenticate,
    validateRequest({ params: rangeParamsSchema, body: deleteRangeSchema }),
    ...writeChain,
    remove,
);

export { technicalSheetRangeRouter };
