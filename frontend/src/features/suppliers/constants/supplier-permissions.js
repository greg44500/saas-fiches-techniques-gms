const SUPPLIER_PERMISSION = Object.freeze({
  SUPPLIER_READ: 'supplier:read',
  SUPPLIER_MANAGE: 'supplier:manage',
  ARTICLE_READ: 'supplier:article:read',
  ARTICLE_MANAGE: 'supplier:article:manage',
  CATALOG_READ: 'supplier:catalog:read',
  CATALOG_IMPORT: 'supplier:catalog:import',
  CATALOG_MANAGE: 'supplier:catalog:manage',
  NEGOTIATED_PRICE_READ: 'supplier:negotiated-price:read',
  NEGOTIATED_PRICE_MANAGE: 'supplier:negotiated-price:manage',
  INVOICED_PRICE_READ: 'supplier:invoiced-price:read',
  INVOICED_PRICE_MANAGE: 'supplier:invoiced-price:manage',
  INVOICED_PRICE_VALIDATE: 'supplier:invoiced-price:validate',
  DOSSIER_REFERENCE_READ: 'supplier:dossier-reference:read',
  DOSSIER_REFERENCE_MANAGE: 'supplier:dossier-reference:manage',
  APPLICABLE_PRICE_READ: 'supplier:applicable-price:read',
  PRICE_POLICY_MANAGE: 'supplier:price-policy:manage',
});

const SUPPLIER_CAPABILITY = Object.freeze({
  CATALOG_IMPORT: 'supplier_catalog_import',
});

const SUPPLIER_REFERENCE_PERMISSION = Object.freeze({
  READ: 'supplier:reference:read',
  MANAGE: 'supplier:reference:manage',
});

const DOSSIER_SUPPLIER_PAGE_PERMISSIONS = Object.freeze([
  SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ,
  SUPPLIER_PERMISSION.INVOICED_PRICE_READ,
  SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ,
  SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ,
]);

export {
  DOSSIER_SUPPLIER_PAGE_PERMISSIONS,
  SUPPLIER_CAPABILITY,
  SUPPLIER_PERMISSION,
  SUPPLIER_REFERENCE_PERMISSION,
};
