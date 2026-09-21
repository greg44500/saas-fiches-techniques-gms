const DOSSIER_ACCESS_GRANT_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({
        value: 'ACTIVE',
        label: 'Active',
    }),
    REVOKED: Object.freeze({
        value: 'REVOKED',
        label: 'Révoquée',
    }),
});

const DOSSIER_ACCESS_GRANT_STATUS = Object.freeze(
    Object.fromEntries(
        Object.entries(DOSSIER_ACCESS_GRANT_STATUS_REGISTRY).map(
            ([key, definition]) => [key, definition.value],
        ),
    ),
);

const DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY = Object.freeze({
    MANUAL: Object.freeze({
        value: 'MANUAL',
        label: 'Révocation manuelle',
    }),
    WORKSPACE_MEMBER_REMOVED: Object.freeze({
        value: 'WORKSPACE_MEMBER_REMOVED',
        label: 'Membre retiré du workspace',
    }),
    DOSSIER_DELETED: Object.freeze({
        value: 'DOSSIER_DELETED',
        label: 'Dossier supprimé',
    }),
});

const DOSSIER_ACCESS_REVOCATION_REASON = Object.freeze(
    Object.fromEntries(
        Object.entries(DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY).map(
            ([key, definition]) => [key, definition.value],
        ),
    ),
);


export {
    DOSSIER_ACCESS_GRANT_STATUS,
    DOSSIER_ACCESS_GRANT_STATUS_REGISTRY,
    DOSSIER_ACCESS_REVOCATION_REASON,
    DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY,
};
