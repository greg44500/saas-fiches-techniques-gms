import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforceWorkspaceAccessMode } from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { objectIdSchema } from '../dossier/dossier.validation.js';
import { PROCESS_SHEET_PERMISSION } from './processSheetPermission.registry.js';
import {
    createWorkspacePhaseTitle,
    listWorkspacePhaseTitles,
} from './processPhaseTitles.service.js';

const processPhaseTitlesRouter = Router({ mergeParams: true });
const paramsSchema = z.strictObject({ workspaceId: objectIdSchema });
const createSchema = z.strictObject({
    title: z.string().trim().min(1).max(160),
});

processPhaseTitlesRouter.get('/',
    authenticate,
    validateRequest({ params: paramsSchema }),
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.READ),
    async (req, res) => {
        const phases = await listWorkspacePhaseTitles({
            workspaceId: req.workspace._id,
        });
        res.status(200).json({ status: 'success', data: { phases } });
    });

processPhaseTitlesRouter.post('/',
    authenticate,
    validateRequest({ params: paramsSchema, body: createSchema }),
    loadWorkspaceContext,
    authorizePermission(PROCESS_SHEET_PERMISSION.EDIT),
    enforceWorkspaceAccessMode(),
    async (req, res) => {
        const template = await createWorkspacePhaseTitle({
            workspaceId: req.workspace._id,
            actorId: req.user._id,
            title: req.validated.body.title,
        });
        res.status(201).json({
            status: 'success',
            data: { phase: { id: template.id, title: template.title } },
        });
    });

export { processPhaseTitlesRouter };
