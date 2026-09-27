const normalizeSupplierText = (value) => {
    if (value === null || value === undefined) return '';

    return String(value)
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['’\x60_/\-]+/g, ' ')
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const normalizeSupplierReference = (value) => {
    if (value === null || value === undefined) return '';

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
};

const formatIdentityDate = (value) => (
    value ? new Date(value).toISOString().slice(0, 10) : '_'
);

const buildSupplierCatalogEditionIdentityKey = ({
    name,
    editionDate = null,
    validFrom = null,
    validTo = null,
}) => [
    normalizeSupplierText(name),
    formatIdentityDate(editionDate),
    formatIdentityDate(validFrom),
    formatIdentityDate(validTo),
].join('|');

export {
    buildSupplierCatalogEditionIdentityKey,
    normalizeSupplierReference,
    normalizeSupplierText,
};
