import {
    createWorkspaceMemberLifecycleRegistry,
    runWorkspaceMemberRemovedLifecycle,
} from '../modules/workspaceMember/workspaceMemberLifecycle.registry.js';
import {
    DOSSIER_ACCESS_WORKSPACE_MEMBER_LIFECYCLE_MODULE,
} from '../modules/dossier/dossierAccess.lifecycle.js';


/**
 * Point de composition unique du lifecycle transactionnel WorkspaceMember.
 *
 * Une application dérivée ajoute ici les descriptors de ses modules qui
 * possèdent des relations métier dépendantes d'un membership. Le Core reste
 * indépendant de ces modèles et fournit uniquement la transaction et le
 * contexte nécessaires.
 *
 * Exemple conceptuel :
 *
 * {
 *     key: 'dossier-access',
 *     onMemberRemoved: async ({
 *         workspaceId,
 *         membershipId,
 *         actorId,
 *         session,
 *     }) => {
 *         // Mise à jour MongoDB métier avec { session }.
 *     },
 * }
 *
 * Les handlers doivent rester déterministes/idempotents dans le contexte
 * transactionnel et ne déclencher aucun effet externe irréversible.
 */
const APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES = Object.freeze([
    DOSSIER_ACCESS_WORKSPACE_MEMBER_LIFECYCLE_MODULE,
]);

const ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY =
    createWorkspaceMemberLifecycleRegistry(
        APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES,
    );

const runApplicationWorkspaceMemberRemovedLifecycle = (context) =>
    runWorkspaceMemberRemovedLifecycle({
        registry: ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY,
        ...context,
    });


export {
    ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY,
    APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES,
    runApplicationWorkspaceMemberRemovedLifecycle,
};
