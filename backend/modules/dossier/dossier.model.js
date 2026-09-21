import mongoose from 'mongoose';

import { DOSSIER_STATUS } from './dossier.registry.js';


const { Schema, model } = mongoose;

const dossierLocationSchema = new Schema(
    {
        address: {
            type: String,
            trim: true,
            maxlength: 240,
            default: null,
        },
        postalCode: {
            type: String,
            trim: true,
            maxlength: 20,
            default: null,
        },
        city: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
    },
    {
        _id: false,
    },
);

const dossierSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 120,
        },
        brand: {
            type: String,
            trim: true,
            maxlength: 120,
            default: null,
        },
        location: {
            type: dossierLocationSchema,
            default: null,
        },
        documentEmail: {
            type: String,
            trim: true,
            maxlength: 254,
            default: null,
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 40,
            default: null,
        },
        contactName: {
            type: String,
            trim: true,
            maxlength: 160,
            default: null,
        },
        status: {
            type: String,
            enum: Object.values(DOSSIER_STATUS),
            default: DOSSIER_STATUS.ACTIVE,
            required: true,
        },
        statusChangedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        statusChangedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        /**
         * Compteur purement technique utilisé pour sérialiser les mutations
         * d'affectation avec les transitions de lifecycle du même Dossier.
         *
         * Les services de grants incrémentent ce champ dans leur transaction.
         * Une transition de statut concurrente écrit le même document et force
         * ainsi MongoDB à détecter le conflit puis à rejouer avec l'état à jour.
         * Ce compteur n'est jamais exposé par l'API.
         */
        accessMutationVersion: {
            type: Number,
            default: 0,
            min: 0,
            required: true,
            select: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

/*
 * La plupart des lectures sont tenant-scoped puis filtrées par statut.
 * Le nom n'est volontairement pas unique : deux magasins peuvent partager
 * une enseigne ou un libellé identique dans un même Workspace.
 */
dossierSchema.index(
    {
        workspace: 1,
        status: 1,
        updatedAt: -1,
    },
    {
        name: 'dossiers_workspace_status_updated_at',
    },
);

dossierSchema.index(
    {
        workspace: 1,
        name: 1,
    },
    {
        name: 'dossiers_workspace_name',
    },
);

dossierSchema.index(
    {
        workspace: 1,
        'location.city': 1,
    },
    {
        name: 'dossiers_workspace_city',
    },
);


const Dossier = model('Dossier', dossierSchema);


export { Dossier };
