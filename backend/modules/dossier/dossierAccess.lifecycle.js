import {
    revokeActiveGrantsForMembershipInSession,
} from './dossierAccess.service.js';


const DOSSIER_ACCESS_WORKSPACE_MEMBER_LIFECYCLE_MODULE =
    Object.freeze({
        key: 'dossier-access',
        onMemberRemoved: async ({
            workspaceId,
            membershipId,
            actorId,
            session,
        }) => {
            await revokeActiveGrantsForMembershipInSession({
                workspaceId,
                membershipId,
                actorId,
                session,
            });
        },
    });


export {
    DOSSIER_ACCESS_WORKSPACE_MEMBER_LIFECYCLE_MODULE,
};
