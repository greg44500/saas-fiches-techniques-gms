import { z } from 'zod';

import {
    DOSSIER_ACCESS_GRANT_STATUS,
} from './dossierAccess.registry.js';
import { objectIdSchema } from './dossier.validation.js';


const dossierAccessParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    dossierId: objectIdSchema,
    membershipId: objectIdSchema,
});

const dossierAccessListQuerySchema = z.strictObject({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
    status: z
        .enum(Object.values(DOSSIER_ACCESS_GRANT_STATUS))
        .default(DOSSIER_ACCESS_GRANT_STATUS.ACTIVE),
});

const emptyBodySchema = z.strictObject({}).default({});


export {
    dossierAccessListQuerySchema,
    dossierAccessParamsSchema,
    emptyBodySchema,
};
