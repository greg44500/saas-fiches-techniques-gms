import mongoose from 'mongoose';

import {
    DOSSIER_ACCESS_GRANT_STATUS,
    DOSSIER_ACCESS_REVOCATION_REASON,
} from './dossierAccess.registry.js';


const { Schema, model } = mongoose;

const dossierAccessGrantSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        dossier: {
            type: Schema.Types.ObjectId,
            ref: 'Dossier',
            required: true,
            immutable: true,
        },
        workspaceMember: {
            type: Schema.Types.ObjectId,
            ref: 'WorkspaceMember',
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(DOSSIER_ACCESS_GRANT_STATUS),
            default: DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
            required: true,
        },
        grantedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        grantedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        revokedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        revocationReason: {
            type: String,
            enum: Object.values(DOSSIER_ACCESS_REVOCATION_REASON),
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

/*
 * La contrainte partielle rend l'invariant race-safe : plusieurs historiques
 * REVOKED sont conservés, mais une seule affectation ACTIVE peut exister pour
 * le même membre et le même Dossier.
 */
dossierAccessGrantSchema.index(
    {
        workspace: 1,
        dossier: 1,
        workspaceMember: 1,
    },
    {
        name: 'dossier_access_active_unique',
        unique: true,
        partialFilterExpression: {
            status: DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
        },
    },
);

dossierAccessGrantSchema.index(
    {
        workspace: 1,
        dossier: 1,
        status: 1,
        grantedAt: -1,
    },
    {
        name: 'dossier_access_dossier_status_granted_at',
    },
);

dossierAccessGrantSchema.index(
    {
        workspace: 1,
        workspaceMember: 1,
        status: 1,
    },
    {
        name: 'dossier_access_member_status',
    },
);


const DossierAccessGrant = model(
    'DossierAccessGrant',
    dossierAccessGrantSchema,
);


export { DossierAccessGrant };
