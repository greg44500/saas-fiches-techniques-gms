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
    PRODUCT_CATALOG_ATTACHED: Object.freeze({
        value: 'PRODUCT_CATALOG_ATTACHED',
        label: 'Produit ajouté au catalogue',
    }),
    PRODUCT_CATALOG_ARCHIVED: Object.freeze({
        value: 'PRODUCT_CATALOG_ARCHIVED',
        label: 'Produit retiré du catalogue',
    }),
    PRODUCT_CATALOG_REACTIVATED: Object.freeze({
        value: 'PRODUCT_CATALOG_REACTIVATED',
        label: 'Produit réactivé dans le catalogue',
    }),
    PRODUCT_REFERENCE_CREATED: Object.freeze({
        value: 'PRODUCT_REFERENCE_CREATED',
        label: 'Produit créé dans le référentiel',
    }),
    PRODUCT_VARIANT_CREATED: Object.freeze({
        value: 'PRODUCT_VARIANT_CREATED',
        label: 'Déclinaison Produit créée',
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
    CANONICAL_PRODUCT: 'CANONICAL_PRODUCT',
    PRODUCT_VARIANT: 'PRODUCT_VARIANT',
    WORKSPACE_PRODUCT: 'WORKSPACE_PRODUCT',
});

export {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ACTION_REGISTRY,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
};
