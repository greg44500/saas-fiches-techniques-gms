import { z } from 'zod';

import { DOSSIER_STATUS } from './dossier.registry.js';


const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'ObjectId invalide');

const nullableTrimmedString = (max) => z
    .string()
    .trim()
    .min(1)
    .max(max)
    .nullable();

const dossierLocationSchema = z.strictObject({
    address: nullableTrimmedString(240).optional(),
    postalCode: nullableTrimmedString(20).optional(),
    city: nullableTrimmedString(120).optional(),
});

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});

const dossierIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
    dossierId: objectIdSchema,
});

const dossierListQuerySchema = z.strictObject({
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
    search: z
        .string()
        .trim()
        .min(1)
        .max(120)
        .optional(),
    status: z
        .enum(Object.values(DOSSIER_STATUS))
        .optional(),
});

const createDossierSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(1)
        .max(120),
    brand: nullableTrimmedString(120).optional(),
    location: dossierLocationSchema
        .nullable()
        .optional(),
    documentEmail: z
        .email()
        .max(254)
        .nullable()
        .optional(),
    phone: nullableTrimmedString(40).optional(),
    contactName: nullableTrimmedString(160).optional(),
});

const updateDossierSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(1)
        .max(120)
        .optional(),
    brand: nullableTrimmedString(120).optional(),
    location: dossierLocationSchema
        .nullable()
        .optional(),
    documentEmail: z
        .email()
        .max(254)
        .nullable()
        .optional(),
    phone: nullableTrimmedString(40).optional(),
    contactName: nullableTrimmedString(160).optional(),
}).superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
        context.addIssue({
            code: 'custom',
            message: 'Au moins un champ doit être fourni.',
        });
    }
});

const updateDossierStatusSchema = z.strictObject({
    status: z.enum(Object.values(DOSSIER_STATUS)),
    reason: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .optional(),
});

const dossierActivityQuerySchema = z.strictObject({
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
});


export {
    createDossierSchema,
    dossierActivityQuerySchema,
    dossierIdParamsSchema,
    dossierListQuerySchema,
    objectIdSchema,
    updateDossierSchema,
    updateDossierStatusSchema,
    workspaceIdParamsSchema,
};
