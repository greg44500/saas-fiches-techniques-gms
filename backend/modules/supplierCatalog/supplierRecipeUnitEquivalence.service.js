/**
 * Une correspondance vérifiée est liée à un conditionnement et à une Référence
 * Produit précis. Elle n'est jamais déduite de unitCount ni d'un poids moyen.
 */
const comparableDecimal = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value);
    return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
};

const packagingSignature = (packaging) => {
    if (!Number.isSafeInteger(packaging?.unitCount)
        || packaging.unitCount < 2
        || !packaging.quantityPerUnit
        || !packaging.unit
        || packaging.unit === 'UNIT') return null;

    return JSON.stringify([
        packaging.containerType?.trim() ?? null,
        packaging.unitCount,
        comparableDecimal(packaging.quantityPerUnit),
        packaging.unit,
        comparableDecimal(packaging.totalQuantity),
        comparableDecimal(packaging.netWeight),
        packaging.netWeightUnit ?? null,
        comparableDecimal(packaging.drainedNetWeight),
        packaging.drainedNetWeightUnit ?? null,
    ]);
};

const verifiedRecipeUnitCount = ({
    packaging,
    equivalence,
    productVariantId,
}) => {
    const signature = packagingSignature(packaging);
    if (!signature
        || !equivalence
        || !productVariantId
        || equivalence.packagingSignature !== signature
        || equivalence.productVariant?.toString() !== productVariantId.toString()
        || !Number.isSafeInteger(equivalence.unitsPerPackage)
        || equivalence.unitsPerPackage < 1) return null;
    return equivalence.unitsPerPackage;
};

export { packagingSignature, verifiedRecipeUnitCount };
