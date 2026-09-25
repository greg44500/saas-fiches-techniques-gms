const PRODUCT_PERMISSION = Object.freeze({
  READ: 'product:read',
  CATALOG_MANAGE: 'product:catalog:manage',
  CONTRIBUTE: 'product:contribute',
});

const PRODUCT_CAPABILITY = Object.freeze({
  REFERENCE_ACCESS: 'product_reference_access',
  CATALOG_IMPORT: 'product_catalog_import',
  CONTRIBUTION: 'product_contribution',
});

const PRODUCT_REFERENCE_PERMISSION = Object.freeze({
  READ: 'product:reference:read',
  MANAGE: 'product:reference:manage',
});

export {
  PRODUCT_CAPABILITY,
  PRODUCT_PERMISSION,
  PRODUCT_REFERENCE_PERMISSION,
};
