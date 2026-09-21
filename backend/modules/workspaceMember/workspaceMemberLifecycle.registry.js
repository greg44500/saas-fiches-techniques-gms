const LIFECYCLE_MODULE_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;


/**
 * Construit le registre transactionnel du lifecycle WorkspaceMember.
 *
 * La V1 expose volontairement uniquement onMemberRemoved : c'est le premier
 * événement générique démontré par une application dérivée. Les modules sont
 * exécutés dans leur ordre de déclaration afin que la composition reste
 * explicite et déterministe.
 */
const createWorkspaceMemberLifecycleRegistry = (modules = []) => {
    if (!Array.isArray(modules)) {
        throw new TypeError('modules must be an array');
    }

    const registeredKeys = new Set();
    const memberRemovedHandlers = [];

    modules.forEach((moduleDefinition, index) => {
        if (
            moduleDefinition === null
            || Array.isArray(moduleDefinition)
            || typeof moduleDefinition !== 'object'
        ) {
            throw new TypeError(
                `WorkspaceMember lifecycle module at index ${index} must be an object`,
            );
        }

        const {
            key,
            onMemberRemoved,
        } = moduleDefinition;

        if (
            typeof key !== 'string'
            || !LIFECYCLE_MODULE_KEY_PATTERN.test(key)
        ) {
            throw new TypeError(
                `WorkspaceMember lifecycle module at index ${index} has an invalid key`,
            );
        }

        if (registeredKeys.has(key)) {
            throw new TypeError(
                `Duplicate WorkspaceMember lifecycle module key: ${key}`,
            );
        }

        if (typeof onMemberRemoved !== 'function') {
            throw new TypeError(
                `WorkspaceMember lifecycle module "${key}" requires onMemberRemoved`,
            );
        }

        registeredKeys.add(key);
        memberRemovedHandlers.push(Object.freeze({
            key,
            onMemberRemoved,
        }));
    });

    return Object.freeze({
        memberRemovedHandlers: Object.freeze(memberRemovedHandlers),
    });
};


/**
 * Exécute les handlers applicatifs dans la transaction MongoDB fournie par le
 * Core. Toute erreur est volontairement propagée : le callback transactionnel
 * doit alors rollbacker le retrait Core et les écritures métier déjà réalisées.
 */
const runWorkspaceMemberRemovedLifecycle = async ({
    registry,
    workspaceId,
    membershipId,
    userId,
    actorId,
    session,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !registry
        || !Array.isArray(registry.memberRemovedHandlers)
    ) {
        throw new TypeError('Invalid WorkspaceMember lifecycle registry');
    }

    if (
        !workspaceId
        || !membershipId
        || !userId
        || !actorId
        || !session
    ) {
        throw new TypeError(
            'workspaceId, membershipId, userId, actorId and session are required',
        );
    }

    const context = Object.freeze({
        workspaceId,
        membershipId,
        userId,
        actorId,
        session,
        ipAddress,
        userAgent,
    });

    for (const moduleDefinition of registry.memberRemovedHandlers) {
        await moduleDefinition.onMemberRemoved(context);
    }
};


export {
    createWorkspaceMemberLifecycleRegistry,
    runWorkspaceMemberRemovedLifecycle,
};
