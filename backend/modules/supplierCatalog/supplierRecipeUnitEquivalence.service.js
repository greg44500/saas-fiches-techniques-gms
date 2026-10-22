import { PRODUCT_REFERENCE_UNIT_REGISTRY } from '../productCatalog/productCatalog.registry.js';

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

// Les signatures déjà stockées conservent leur représentation d'origine.
// Comparer leur contenu physique sans les réécrire : 120 g = 0,120 kg.
const exactDecimal = (value) => {
    if (value == null) return null;
    const match = String(value).match(/^(\\d+)(?:\\.(\\d+))?$/);
    if (!match) return null;
    const fraction = match[2] ?? '';
    return {
        numerator: BigInt(match[1] + fraction),
        denominator: 10n ** BigInt(fraction.length),
    };
};

const samePhysicalQuantity = (leftAmount, leftUnit, rightAmount, rightUnit) => {
    if (leftAmount == null || rightAmount == null) {
        // Un poids manquant ne peut pas servir à justifier un poids présent.
        return leftAmount == null && rightAmount == null
            && leftUnit === rightUnit;
    }
    const leftDefinition = PRODUCT_REFERENCE_UNIT_REGISTRY[leftUnit];
    const rightDefinition = PRODUCT_REFERENCE_UNIT_REGISTRY[rightUnit];
    const left = exactDecimal(leftAmount);
    const right = exactDecimal(rightAmount);
    if (!left || !right || !leftDefinition || !rightDefinition
        || leftDefinition.dimension !== rightDefinition.dimension) return false;
    return left.numerator * BigInt(leftDefinition.factorToBase)
            * right.denominator
        === right.numerator * BigInt(rightDefinition.factorToBase)
            * left.denominator;
};

const packagingSignaturesMatch = (left, right) => {
    if (!left || !right) return false;
    if (left === right) return true;
    let a;
    let b;
    try {
        a = JSON.parse(left);
        b = JSON.parse(right);
    } catch {
        return false;
    }
    if (!Array.isArray(a) || !Array.isArray(b)
        || a.length !== 9 || b.length !== 9
        || a[0] !== b[0] || a[1] !== b[1]) return false;

    return samePhysicalQuantity(a[2], a[3], b[2], b[3])
        && samePhysicalQuantity(a[4], a[3], b[4], b[3])
        && samePhysicalQuantity(a[5], a[6], b[5], b[6])
        && samePhysicalQuantity(a[7], a[8], b[7], b[8]);
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
        || !packagingSignaturesMatch(equivalence.packagingSignature, signature)
        || equivalence.productVariant?.toString() !== productVariantId.toString()
        || !Number.isSafeInteger(equivalence.unitsPerPackage)
        || equivalence.unitsPerPackage < 1) return null;
    return equivalence.unitsPerPackage;
};

export { packagingSignature, packagingSignaturesMatch, verifiedRecipeUnitCount };
