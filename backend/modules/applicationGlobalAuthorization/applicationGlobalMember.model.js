import mongoose from 'mongoose';

import {
    APPLICATION_GLOBAL_MEMBER_STATUS,
} from '../../constants/applicationGlobalAuthorization.constants.js';

const { Schema, model } = mongoose;

/**
 * Appartenance d'un User à l'autorité globale de l'application dérivée.
 *
 * Le document ne modifie ni User, ni ses memberships Workspace, ni son
 * éventuelle appartenance Platform. Une révocation conserve l'historique et
 * une future réattribution crée une nouvelle appartenance courante.
 */
const applicationGlobalMemberSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        role: {
            type: Schema.Types.ObjectId,
            ref: 'ApplicationGlobalRole',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(
                APPLICATION_GLOBAL_MEMBER_STATUS,
            ),
            default: APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
            required: true,
        },
        joinedAt: {
            type: Date,
            default: Date.now,
            required: true,
            immutable: true,
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
        suspendedAt: {
            type: Date,
            default: null,
        },
        suspendedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
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
    },
    {
        timestamps: true,
    },
);

applicationGlobalMemberSchema.index(
    { user: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: [
                    APPLICATION_GLOBAL_MEMBER_STATUS.ACTIVE,
                    APPLICATION_GLOBAL_MEMBER_STATUS.SUSPENDED,
                ],
            },
        },
        name: 'application_global_current_member_user_unique',
    },
);

applicationGlobalMemberSchema.index(
    {
        status: 1,
        role: 1,
        createdAt: -1,
    },
    {
        name: 'application_global_member_status_role',
    },
);

const ApplicationGlobalMember = model(
    'ApplicationGlobalMember',
    applicationGlobalMemberSchema,
);

export { ApplicationGlobalMember };
