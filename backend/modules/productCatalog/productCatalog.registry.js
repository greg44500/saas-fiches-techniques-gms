const PRODUCT_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
});

const PRODUCT_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({ value: PRODUCT_STATUS.ACTIVE, label: 'Actif' }),
    ARCHIVED: Object.freeze({ value: PRODUCT_STATUS.ARCHIVED, label: 'Archivé' }),
});

const WORKSPACE_PRODUCT_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({ value: 'ACTIVE', label: 'Dans mon référentiel' }),
    ARCHIVED: Object.freeze({ value: 'ARCHIVED', label: 'Retiré de mon référentiel' }),
});

const WORKSPACE_PRODUCT_STATUS = Object.freeze(
    Object.fromEntries(Object.entries(WORKSPACE_PRODUCT_STATUS_REGISTRY).map(
        ([key, definition]) => [key, definition.value],
    )),
);

const PRODUCT_CATEGORY_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({ value: 'ACTIVE', label: 'Active' }),
    ARCHIVED: Object.freeze({ value: 'ARCHIVED', label: 'Archivée' }),
});

const PRODUCT_CATEGORY_STATUS = Object.freeze(
    Object.fromEntries(Object.entries(PRODUCT_CATEGORY_STATUS_REGISTRY).map(
        ([key, definition]) => [key, definition.value],
    )),
);

const PRODUCT_REJECTION_REASON_REGISTRY = Object.freeze({
    DUPLICATE: Object.freeze({ value: 'DUPLICATE', label: 'Doublon' }),
    INVALID_IDENTITY: Object.freeze({ value: 'INVALID_IDENTITY', label: 'Identité invalide' }),
    OUT_OF_SCOPE: Object.freeze({ value: 'OUT_OF_SCOPE', label: 'Hors périmètre' }),
    INSUFFICIENT_INFORMATION: Object.freeze({
        value: 'INSUFFICIENT_INFORMATION',
        label: 'Informations insuffisantes',
    }),
});

const PRODUCT_REJECTION_REASON = Object.freeze(
    Object.fromEntries(Object.entries(PRODUCT_REJECTION_REASON_REGISTRY).map(
        ([key, definition]) => [key, definition.value],
    )),
);

const PRODUCT_CHARACTERISTIC_KIND_REGISTRY = Object.freeze({
    PRESENTATION: Object.freeze({
        value: 'PRESENTATION',
        label: 'Présentation',
    }),
    COMMERCIAL_TYPE: Object.freeze({
        value: 'COMMERCIAL_TYPE',
        label: 'Type commercial',
    }),
    SIZE_FORMAT: Object.freeze({
        value: 'SIZE_FORMAT',
        label: 'Calibre / format',
    }),
    COLOR: Object.freeze({
        value: 'COLOR',
        label: 'Couleur',
    }),
    QUALITY_DESIGNATION: Object.freeze({
        value: 'QUALITY_DESIGNATION',
        label: 'Désignation de qualité',
    }),
});

const PRODUCT_CHARACTERISTIC_KIND = Object.freeze(
    Object.fromEntries(
        Object.entries(PRODUCT_CHARACTERISTIC_KIND_REGISTRY).map(
            ([key, definition]) => [key, definition.value],
        ),
    ),
);

const PRODUCT_REFERENCE_UNIT_REGISTRY = Object.freeze({
    G: Object.freeze({ value: 'G', label: 'g', dimension: 'MASS', factorToBase: 1 }),
    KG: Object.freeze({ value: 'KG', label: 'kg', dimension: 'MASS', factorToBase: 1000 }),
    ML: Object.freeze({ value: 'ML', label: 'ml', dimension: 'VOLUME', factorToBase: 1 }),
    CL: Object.freeze({ value: 'CL', label: 'cl', dimension: 'VOLUME', factorToBase: 10 }),
    L: Object.freeze({ value: 'L', label: 'l', dimension: 'VOLUME', factorToBase: 1000 }),
    UNIT: Object.freeze({ value: 'UNIT', label: 'unité', dimension: 'COUNT', factorToBase: 1 }),
});

const PRODUCT_REFERENCE_UNIT = Object.freeze(
    Object.fromEntries(Object.entries(PRODUCT_REFERENCE_UNIT_REGISTRY).map(
        ([key, definition]) => [key, definition.value],
    )),
);

const PRODUCT_FOOD_RANGE_REGISTRY = Object.freeze({
    1: Object.freeze({
        value: 1,
        label: 'Gamme 1',
        name: 'Frais',
        processingStates: Object.freeze(['Produit frais']),
        defaultProcessingState: 'Produit frais',
    }),
    2: Object.freeze({
        value: 2,
        label: 'Gamme 2',
        name: 'Conserves',
        processingStates: Object.freeze(['Conserve']),
        defaultProcessingState: 'Conserve',
    }),
    3: Object.freeze({
        value: 3,
        label: 'Gamme 3',
        name: 'Surgelés',
        processingStates: Object.freeze(['Surgelé']),
        defaultProcessingState: 'Surgelé',
    }),
    4: Object.freeze({
        value: 4,
        label: 'Gamme 4',
        name: 'Sous-vide cru / épluchés',
        processingStates: Object.freeze(['Sous-vide cru / épluché']),
        defaultProcessingState: 'Sous-vide cru / épluché',
    }),
    5: Object.freeze({
        value: 5,
        label: 'Gamme 5',
        name: 'Sous-vide cuit',
        processingStates: Object.freeze(['Sous-vide cuit']),
        defaultProcessingState: 'Sous-vide cuit',
    }),
    6: Object.freeze({
        value: 6,
        label: 'Gamme 6',
        name: 'PAI / PAE',
        processingStates: Object.freeze(['PAI / PAE']),
        defaultProcessingState: 'PAI / PAE',
    }),
});

const PRODUCT_FOOD_RANGES = Object.freeze(
    Object.values(PRODUCT_FOOD_RANGE_REGISTRY).map(({ value }) => value),
);

const PRODUCT_REFERENCE_EVENT_ACTION = Object.freeze({
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_APPROVED: 'PRODUCT_APPROVED',
    PRODUCT_REJECTED: 'PRODUCT_REJECTED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_ARCHIVED: 'PRODUCT_ARCHIVED',
    PRODUCT_REACTIVATED: 'PRODUCT_REACTIVATED',
    VARIANT_CREATED: 'VARIANT_CREATED',
    VARIANT_APPROVED: 'VARIANT_APPROVED',
    VARIANT_REJECTED: 'VARIANT_REJECTED',
    VARIANT_UPDATED: 'VARIANT_UPDATED',
    VARIANT_ARCHIVED: 'VARIANT_ARCHIVED',
    VARIANT_REACTIVATED: 'VARIANT_REACTIVATED',
    VARIETY_CREATED: 'VARIETY_CREATED',
    VARIETY_UPDATED: 'VARIETY_UPDATED',
    VARIETY_ARCHIVED: 'VARIETY_ARCHIVED',
    VARIETY_REACTIVATED: 'VARIETY_REACTIVATED',
    CHARACTERISTIC_CREATED: 'CHARACTERISTIC_CREATED',
    CHARACTERISTIC_UPDATED: 'CHARACTERISTIC_UPDATED',
    CHARACTERISTIC_ARCHIVED: 'CHARACTERISTIC_ARCHIVED',
    CHARACTERISTIC_REACTIVATED: 'CHARACTERISTIC_REACTIVATED',
    CATEGORY_CREATED: 'CATEGORY_CREATED',
    CATEGORY_UPDATED: 'CATEGORY_UPDATED',
    CATEGORY_ARCHIVED: 'CATEGORY_ARCHIVED',
    CATEGORY_REACTIVATED: 'CATEGORY_REACTIVATED',
});

const PRODUCT_REFERENCE_EVENT_ENTITY_TYPE = Object.freeze({
    PRODUCT: 'PRODUCT',
    VARIANT: 'VARIANT',
    VARIETY: 'VARIETY',
    CHARACTERISTIC: 'CHARACTERISTIC',
    CATEGORY: 'CATEGORY',
});

const PRODUCT_IMPORT_SCOPE = Object.freeze({
    WORKSPACE: 'WORKSPACE',
    GLOBAL: 'GLOBAL',
});

const PRODUCT_IMPORT_STATUS = Object.freeze({
    INSPECTED: 'INSPECTED',
    PREVIEWED: 'PREVIEWED',
    COMMITTING: 'COMMITTING',
    COMMITTED: 'COMMITTED',
});

const PRODUCT_IMPORT_ROW_CLASSIFICATION = Object.freeze({
    ATTACH_EXISTING: 'ATTACH_EXISTING',
    CREATE_PRODUCT: 'CREATE_PRODUCT',
    CREATE_VARIANT: 'CREATE_VARIANT',
    REVIEW_REQUIRED: 'REVIEW_REQUIRED',
    INVALID: 'INVALID',
});

export {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_CATEGORY_STATUS_REGISTRY,
    PRODUCT_CHARACTERISTIC_KIND,
    PRODUCT_CHARACTERISTIC_KIND_REGISTRY,
    PRODUCT_FOOD_RANGE_REGISTRY,
    PRODUCT_FOOD_RANGES,
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
    PRODUCT_IMPORT_SCOPE,
    PRODUCT_IMPORT_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_REFERENCE_UNIT,
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_REJECTION_REASON,
    PRODUCT_REJECTION_REASON_REGISTRY,
    PRODUCT_STATUS,
    PRODUCT_STATUS_REGISTRY,
    WORKSPACE_PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS_REGISTRY,
};
