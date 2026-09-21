const DOSSIER_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({
        value: 'ACTIVE',
        label: 'Actif',
    }),
    PAUSED: Object.freeze({
        value: 'PAUSED',
        label: 'En pause',
    }),
    ARCHIVED: Object.freeze({
        value: 'ARCHIVED',
        label: 'Archivé',
    }),
    DELETED: Object.freeze({
        value: 'DELETED',
        label: 'Supprimé',
    }),
});

const DOSSIER_STATUS = Object.freeze(
    Object.fromEntries(
        Object.entries(DOSSIER_STATUS_REGISTRY).map(
            ([key, definition]) => [key, definition.value],
        ),
    ),
);

const DOSSIER_STATUS_TRANSITIONS = Object.freeze({
    [DOSSIER_STATUS.ACTIVE]: Object.freeze([
        DOSSIER_STATUS.PAUSED,
        DOSSIER_STATUS.ARCHIVED,
        DOSSIER_STATUS.DELETED,
    ]),
    [DOSSIER_STATUS.PAUSED]: Object.freeze([
        DOSSIER_STATUS.ACTIVE,
        DOSSIER_STATUS.ARCHIVED,
        DOSSIER_STATUS.DELETED,
    ]),
    [DOSSIER_STATUS.ARCHIVED]: Object.freeze([
        DOSSIER_STATUS.PAUSED,
        DOSSIER_STATUS.DELETED,
    ]),
    [DOSSIER_STATUS.DELETED]: Object.freeze([
        DOSSIER_STATUS.PAUSED,
    ]),
});


export {
    DOSSIER_STATUS,
    DOSSIER_STATUS_REGISTRY,
    DOSSIER_STATUS_TRANSITIONS,
};
