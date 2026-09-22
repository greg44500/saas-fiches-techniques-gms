import mongoose from 'mongoose';

import {
    APPLICATION_GLOBAL_ROLE_STATUS,
} from '../../constants/applicationGlobalAuthorization.constants.js';

const { Schema, model } = mongoose;

const APPLICATION_GLOBAL_ROLE_KEY_PATTERN =
    /^[a-z][a-z0-9_-]*$/;

const APPLICATION_GLOBAL_PERMISSION_PATTERN =
    /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)+$/;

/**
 * Rôle global propre à l'application dérivée.
 *
 * Cette autorité est indépendante du RBAC Workspace et du RBAC Platform. Le
 * modèle ne connaît aucune permission métier particulière : les valeurs
 * persistées sont validées par les services contre le registre applicatif.
 */
const applicationGlobalRoleSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            immutable: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 80,
            match: [
                APPLICATION_GLOBAL_ROLE_KEY_PATTERN,
                'Le format de la clé du rôle global applicatif est invalide.',
            ],
        },
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        description: {
            type: String,
            default: null,
            trim: true,
            maxlength: 500,
        },
        permissions: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                    match: [
                        APPLICATION_GLOBAL_PERMISSION_PATTERN,
                        'Le format de la permission globale applicative est invalide.',
                    ],
                },
            ],
            default: [],
        },
        isSystem: {
            type: Boolean,
            default: false,
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(
                APPLICATION_GLOBAL_ROLE_STATUS,
            ),
            default: APPLICATION_GLOBAL_ROLE_STATUS.ACTIVE,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        archivedAt: {
            type: Date,
            default: null,
        },
        archivedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

applicationGlobalRoleSchema.index(
    { key: 1 },
    {
        unique: true,
        name: 'application_global_role_key_unique',
    },
);

applicationGlobalRoleSchema.index(
    {
        status: 1,
        isSystem: 1,
    },
    {
        name: 'application_global_role_status_system',
    },
);

const ApplicationGlobalRole = model(
    'ApplicationGlobalRole',
    applicationGlobalRoleSchema,
);

export { ApplicationGlobalRole };
