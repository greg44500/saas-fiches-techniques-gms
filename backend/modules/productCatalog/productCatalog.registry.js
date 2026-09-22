const PRODUCT_STATUS_REGISTRY = Object.freeze({
    PENDING_REVIEW: Object.freeze({ value: 'PENDING_REVIEW', label: 'En validation' }),
    ACTIVE: Object.freeze({ value: 'ACTIVE', label: 'Actif' }),
    ARCHIVED: Object.freeze({ value: 'ARCHIVED', label: 'Archivé' }),
    REJECTED: Object.freeze({ value: 'REJECTED', label: 'Rejeté' }),
});

const PRODUCT_STATUS = Object.freeze(
    Object.fromEntries(Object.entries(PRODUCT_STATUS_REGISTRY).map(
        ([key, definition]) => [key, definition.value],
    )),
);

const WORKSPACE_PRODUCT_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({ value: 'ACTIVE', label: 'Dans le catalogue' }),
    ARCHIVED: Object.freeze({ value: 'ARCHIVED', label: 'Retiré du catalogue' }),
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

const PRODUCT_FOOD_RANGES = Object.freeze([1, 2, 3, 4, 5]);

const PRODUCT_REFERENCE_EVENT_ACTION = Object.freeze({
    PRODUCT_APPROVED: 'PRODUCT_APPROVED',
    PRODUCT_REJECTED: 'PRODUCT_REJECTED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_ARCHIVED: 'PRODUCT_ARCHIVED',
    PRODUCT_REACTIVATED: 'PRODUCT_REACTIVATED',
    VARIANT_APPROVED: 'VARIANT_APPROVED',
    VARIANT_REJECTED: 'VARIANT_REJECTED',
    VARIANT_UPDATED: 'VARIANT_UPDATED',
    VARIANT_ARCHIVED: 'VARIANT_ARCHIVED',
    VARIANT_REACTIVATED: 'VARIANT_REACTIVATED',
    CATEGORY_CREATED: 'CATEGORY_CREATED',
    CATEGORY_UPDATED: 'CATEGORY_UPDATED',
    CATEGORY_ARCHIVED: 'CATEGORY_ARCHIVED',
    CATEGORY_REACTIVATED: 'CATEGORY_REACTIVATED',
});

const PRODUCT_REFERENCE_EVENT_ENTITY_TYPE = Object.freeze({
    PRODUCT: 'PRODUCT',
    VARIANT: 'VARIANT',
    CATEGORY: 'CATEGORY',
});

const PRODUCT_IMPORT_STATUS = Object.freeze({
    INSPECTED: 'INSPECTED',
    PREVIEWED: 'PREVIEWED',
    COMMITTED: 'COMMITTED',
});

const PRODUCT_IMPORT_ROW_CLASSIFICATION = Object.freeze({
    ATTACH_EXISTING: 'ATTACH_EXISTING',
    EXISTING_PENDING: 'EXISTING_PENDING',
    PROPOSE_PRODUCT: 'PROPOSE_PRODUCT',
    PROPOSE_VARIANT: 'PROPOSE_VARIANT',
    REVIEW_REQUIRED: 'REVIEW_REQUIRED',
    PRIVATE_CONFLICT: 'PRIVATE_CONFLICT',
    INVALID: 'INVALID',
});

export {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_CATEGORY_STATUS_REGISTRY,
    PRODUCT_FOOD_RANGES,
    PRODUCT_IMPORT_ROW_CLASSIFICATION,
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
