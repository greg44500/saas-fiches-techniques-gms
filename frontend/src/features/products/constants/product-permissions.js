const PRODUCT_PERMISSION = Object.freeze({
  READ: 'product:read',
  CATALOG_MANAGE: 'product:catalog:manage',
  CONTRIBUTE: 'product:contribute',
});

const PLATFORM_PRODUCT_PERMISSION = Object.freeze({
  READ: 'platform:products:read',
  MANAGE: 'platform:products:manage',
});

export { PLATFORM_PRODUCT_PERMISSION, PRODUCT_PERMISSION };
