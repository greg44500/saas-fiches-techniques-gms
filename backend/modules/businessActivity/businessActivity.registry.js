const BUSINESS_ACTIVITY_ACTION_REGISTRY = Object.freeze({
    DOSSIER_CREATED: Object.freeze({
        value: 'DOSSIER_CREATED',
        label: 'Dossier créé',
    }),
    DOSSIER_UPDATED: Object.freeze({
        value: 'DOSSIER_UPDATED',
        label: 'Dossier modifié',
    }),
    DOSSIER_STATUS_CHANGED: Object.freeze({
        value: 'DOSSIER_STATUS_CHANGED',
        label: 'Statut du dossier modifié',
    }),
    DOSSIER_ACCESS_GRANTED: Object.freeze({
        value: 'DOSSIER_ACCESS_GRANTED',
        label: 'Accès au dossier accordé',
    }),
    DOSSIER_ACCESS_REVOKED: Object.freeze({
        value: 'DOSSIER_ACCESS_REVOKED',
        label: 'Accès au dossier révoqué',
    }),
});

const BUSINESS_ACTIVITY_ACTION = Object.freeze(
    Object.fromEntries(
        Object.entries(BUSINESS_ACTIVITY_ACTION_REGISTRY).map(
            ([key, definition]) => [key, definition.value],
        ),
    ),
);


const BUSINESS_ACTIVITY_ENTITY_TYPE = Object.freeze({
    DOSSIER: 'DOSSIER',
    DOSSIER_ACCESS_GRANT: 'DOSSIER_ACCESS_GRANT',
});


export {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ACTION_REGISTRY,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
};
