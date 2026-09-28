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
    TECHNICAL_SHEET_CREATED: Object.freeze({
        value: 'TECHNICAL_SHEET_CREATED',
        label: 'Fiche technique créée',
    }),
    TECHNICAL_SHEET_UPDATED: Object.freeze({
        value: 'TECHNICAL_SHEET_UPDATED',
        label: 'Fiche technique modifiée',
    }),
    TECHNICAL_SHEET_DRAFT_SAVED: Object.freeze({
        value: 'TECHNICAL_SHEET_DRAFT_SAVED',
        label: 'Brouillon de Fiche technique enregistré',
    }),
    TECHNICAL_SHEET_SOURCING_CHANGED: Object.freeze({
        value: 'TECHNICAL_SHEET_SOURCING_CHANGED',
        label: 'Approvisionnement de Fiche technique modifié',
    }),
    TECHNICAL_SHEET_VALUATED: Object.freeze({
        value: 'TECHNICAL_SHEET_VALUATED',
        label: 'Fiche technique valorisée',
    }),
    TECHNICAL_SHEET_REVALUATED: Object.freeze({
        value: 'TECHNICAL_SHEET_REVALUATED',
        label: 'Fiche technique revalorisée',
    }),
    TECHNICAL_SHEET_VALIDATED: Object.freeze({
        value: 'TECHNICAL_SHEET_VALIDATED',
        label: 'Fiche technique validée',
    }),
    TECHNICAL_SHEET_ARCHIVED: Object.freeze({
        value: 'TECHNICAL_SHEET_ARCHIVED',
        label: 'Fiche technique archivée',
    }),
    TECHNICAL_SHEET_REACTIVATED: Object.freeze({
        value: 'TECHNICAL_SHEET_REACTIVATED',
        label: 'Fiche technique réactivée',
    }),
    TECHNICAL_SHEET_DELETED: Object.freeze({
        value: 'TECHNICAL_SHEET_DELETED',
        label: 'Fiche technique placée dans la corbeille',
    }),
    TECHNICAL_SHEET_RESTORED: Object.freeze({
        value: 'TECHNICAL_SHEET_RESTORED',
        label: 'Fiche technique restaurée',
    }),
    TECHNICAL_SHEET_PURGED: Object.freeze({
        value: 'TECHNICAL_SHEET_PURGED',
        label: 'Fiche technique purgée',
    }),
    TECHNICAL_SHEET_COPIED: Object.freeze({
        value: 'TECHNICAL_SHEET_COPIED',
        label: 'Fiche technique copiée',
    }),
    TECHNICAL_SHEET_DEFAULT_MARGIN_UPDATED: Object.freeze({
        value: 'TECHNICAL_SHEET_DEFAULT_MARGIN_UPDATED',
        label: 'Marge cible par défaut modifiée',
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
    TECHNICAL_SHEET: 'TECHNICAL_SHEET',
});

export {
    BUSINESS_ACTIVITY_ACTION,
    BUSINESS_ACTIVITY_ACTION_REGISTRY,
    BUSINESS_ACTIVITY_ENTITY_TYPE,
};
