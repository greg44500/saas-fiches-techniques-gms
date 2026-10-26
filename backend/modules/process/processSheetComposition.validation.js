import { z } from 'zod';

import {
    objectIdSchema,
} from '../dossier/dossier.validation.js';

const processSheetCompositionParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    dossierId: objectIdSchema,
    technicalSheetId: objectIdSchema,
});

export { processSheetCompositionParamsSchema };
