import { PRODUCT_REFERENCE_UNIT_REGISTRY } from '../productCatalog/productCatalog.registry.js';
import {
    normalizeSupplierPrice,
    parseDecimalFraction,
    rationalToDecimal128String,
} from './supplierPriceMath.service.js';

const unitLabel = (unit, variant = null) => unit === 'UNIT'
    ? (variant?.countUnitLabelSingular || 'pièce')
    : PRODUCT_REFERENCE_UNIT_REGISTRY[unit]?.label ?? unit;
const printQuantity = (value) => String(value).replace(/\.0+$/, '');
const money = (value, currency = 'EUR') => {
    if (value === null || value === undefined) return null;
    const formatted = Number(value).toLocaleString('fr-FR', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
    });
    return formatted + ' ' + (currency === 'EUR' ? '€' : currency) + ' HT';
};
const normalizedUnit = (unit) => {
    const dimension = PRODUCT_REFERENCE_UNIT_REGISTRY[unit]?.dimension;
    if (dimension === 'MASS') return 'KG';
    if (dimension === 'VOLUME') return 'L';
    if (dimension === 'COUNT') return 'UNIT';
    return null;
};

const comparableAmounts = (left, leftUnit, right, rightUnit) => {
    const l = PRODUCT_REFERENCE_UNIT_REGISTRY[leftUnit];
    const r = PRODUCT_REFERENCE_UNIT_REGISTRY[rightUnit];
    if (!l || !r || l.dimension !== r.dimension) return false;
    return Number(left) * l.factorToBase === Number(right) * r.factorToBase;
};

const supplierPackagingLabel = (
    packaging, productVariant = null, { includeWeights = true } = {},
) => {
    if (!packaging) return 'Non renseigné';
    const parts = [];
    const label = packaging.supplierLabel || packaging.containerType;
    if (label) parts.push(label);
    const hasUnits = packaging.unitCount && packaging.quantityPerUnit && packaging.unit;
    if (hasUnits) {
        parts.push(packaging.unitCount + ' × ' + printQuantity(packaging.quantityPerUnit)
            + ' ' + unitLabel(packaging.unit, productVariant));
    } else if (packaging.unitCount) {
        parts.push(packaging.unitCount + ' unités');
    }
    if (packaging.totalQuantity && packaging.unit && !hasUnits) {
        parts.push('total ' + printQuantity(packaging.totalQuantity)
            + ' ' + unitLabel(packaging.unit, productVariant));
    }
    if (includeWeights && packaging.netWeight && packaging.netWeightUnit
        && !(packaging.totalQuantity && packaging.unit && comparableAmounts(
            packaging.netWeight, packaging.netWeightUnit,
            packaging.totalQuantity, packaging.unit,
        ))) {
        parts.push('net ' + printQuantity(packaging.netWeight)
            + ' ' + unitLabel(packaging.netWeightUnit));
    }
    if (includeWeights && packaging.drainedNetWeight && packaging.drainedNetWeightUnit) {
        parts.push('égoutté ' + printQuantity(packaging.drainedNetWeight)
            + ' ' + unitLabel(packaging.drainedNetWeightUnit));
    }
    return parts.join(' · ') || 'Non renseigné';
};

// Projections de lecture : le poids calculé et le poids net saisi sont
// distincts. Une différence ne doit jamais être masquée ou corrigée en UI.
const convertedQuantity = (value, sourceUnit, targetUnit) => {
    const source = PRODUCT_REFERENCE_UNIT_REGISTRY[sourceUnit];
    const target = PRODUCT_REFERENCE_UNIT_REGISTRY[targetUnit];
    if (!source || !target || source.dimension !== target.dimension) return null;
    const parsed = parseDecimalFraction(value);
    return rationalToDecimal128String({
        numerator: parsed.numerator * BigInt(source.factorToBase),
        denominator: parsed.denominator * BigInt(target.factorToBase),
    });
};

const readableQuantity = (value) => Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: 3,
});

const supplierPackagingPresentation = (packaging, productVariant = null) => {
    const mainLabel = supplierPackagingLabel(packaging, productVariant, {
        includeWeights: false,
    });
    const empty = { mainLabel, totalLabel: null, warningLabel: null };
    if (!packaging) return empty;

    const dimension = PRODUCT_REFERENCE_UNIT_REGISTRY[packaging.unit]?.dimension;
    const totalUnit = normalizedUnit(packaging.unit);
    const total = packaging.totalQuantity && totalUnit
        ? convertedQuantity(packaging.totalQuantity, packaging.unit, totalUnit)
        : null;

    let totalLabel = null;
    if (total !== null && Number(total) > 0) {
        if (dimension === 'MASS') {
            totalLabel = 'Poids net total : ' + readableQuantity(total) + ' kg';
        } else if (dimension === 'VOLUME') {
            totalLabel = 'Volume total : ' + readableQuantity(total) + ' L';
        } else if (dimension === 'COUNT') {
            const countName = Number(total) === 1
                ? (productVariant?.countUnitLabelSingular || 'pièce')
                : (productVariant?.countUnitLabelPlural || 'pièces');
            totalLabel = 'Quantité totale : ' + readableQuantity(total) + ' ' + countName;
        }
    }

    const declaredNet = packaging.netWeight && packaging.netWeightUnit
        ? convertedQuantity(packaging.netWeight, packaging.netWeightUnit, 'KG')
        : null;
    let warningLabel = null;
    if (declaredNet !== null && total !== null && dimension === 'MASS'
        && !comparableAmounts(
            packaging.netWeight, packaging.netWeightUnit,
            packaging.totalQuantity, packaging.unit,
        )) {
        totalLabel = 'Poids total calculé : ' + readableQuantity(total) + ' kg';
        warningLabel = 'Poids net déclaré à vérifier : '
            + readableQuantity(declaredNet) + ' kg';
    } else if (!totalLabel && declaredNet !== null) {
        totalLabel = 'Poids net déclaré : ' + readableQuantity(declaredNet) + ' kg';
    }

    return { mainLabel, totalLabel, warningLabel };
};

const packagePriceAmount = ({ amount, basis, packaging }) => {
    if (basis === 'PACKAGE') return String(amount);
    if (!packaging?.totalQuantity || !packaging?.unit) return null;
    const source = PRODUCT_REFERENCE_UNIT_REGISTRY[basis];
    const unit = PRODUCT_REFERENCE_UNIT_REGISTRY[packaging.unit];
    if (!source || !unit || source.dimension !== unit.dimension) return null;
    const price = parseDecimalFraction(amount);
    const quantity = parseDecimalFraction(packaging.totalQuantity);
    return rationalToDecimal128String({
        numerator: price.numerator * quantity.numerator
            * BigInt(unit.factorToBase),
        denominator: price.denominator * quantity.denominator
            * BigInt(source.factorToBase),
    });
};

const supplierSourcePriceLabel = (price, packaging) => {
    if (!price) return null;
    return money(price.amount, price.currency) + ' / '
        + (price.basis === 'PACKAGE'
            ? (packaging?.containerType || 'conditionnement')
            : unitLabel(price.basis));
};

const supplierTariffPresentation = (tariff, article) => {
    if (!tariff) return null;
    const packaging = tariff.packagingSnapshot ?? article.packaging;
    const basis = tariff.sourceBasis;
    const currency = tariff.currency || 'EUR';
    const target = normalizedUnit(
        article.productVariant?.referenceUnit
        || (basis === 'PACKAGE' ? packaging?.unit : basis),
    );
    const normalized = target ? normalizeSupplierPrice({
        sourceAmount: tariff.sourceAmount,
        sourceBasis: basis,
        packaging,
        targetUnit: target,
        // Même règle que le résolveur M-003 : une équivalence de pièces
        // actuelle ne prouve pas le contenu d'un ancien tarif sans snapshot.
        recipeUnitEquivalence: tariff.packagingSnapshot
            ? article.recipeUnitEquivalence : null,
        productVariantId: article.productVariant?._id,
    }) : { normalizedAmount: null, normalizedUnit: null };
    const amountOfPackage = packagePriceAmount({
        amount: tariff.sourceAmount, basis, packaging,
    });
    // Une pièce n'est identifiable que si le colis décrit explicitement
    // plusieurs éléments physiques de même quantité. UNIT est traité
    // directement par le prix normalisé M-002, sans le confondre avec le colis.
    const pieceCount = packaging?.unitCount;
    const canPricePiece = Number.isInteger(pieceCount) && pieceCount > 1
        && packaging?.quantityPerUnit && packaging?.unit !== 'UNIT'
        && packaging?.unit && amountOfPackage !== null;
    const piecePrice = canPricePiece
        ? (() => {
            const amount = parseDecimalFraction(amountOfPackage);
            return rationalToDecimal128String({
                numerator: amount.numerator,
                denominator: amount.denominator * BigInt(pieceCount),
            });
        })()
        : null;
    return {
        id: tariff._id.toString(),
        sourceKind: tariff.sourceKind || 'CATALOG',
        sourceLabel: tariff.sourceKind === 'PRICE_LIST'
            ? tariff.sourceLabel : tariff.catalogEdition?.name ?? null,
        sourceAmount: String(tariff.sourceAmount),
        sourceBasis: basis,
        currency,
        validFrom: tariff.validFrom,
        validTo: tariff.validTo,
        packageAmount: amountOfPackage,
        pieceAmount: piecePrice,
        piecePriceLabel: piecePrice !== null
            ? money(piecePrice, currency) + ' / pièce'
            : null,
        normalizedAmount: normalized.normalizedAmount,
        normalizedUnit: normalized.normalizedUnit,
        packagePriceLabel: amountOfPackage !== null
            ? money(amountOfPackage, currency) + ' / '
                + (packaging?.containerType || 'conditionnement')
            : null,
        unitPriceLabel: normalized.normalizedAmount !== null
            ? money(normalized.normalizedAmount, currency)
                + ' / ' + unitLabel(normalized.normalizedUnit, article.productVariant)
            : null,
        sourcePriceLabel: money(tariff.sourceAmount, currency)
            + ' / ' + (basis === 'PACKAGE'
                ? (packaging?.containerType || 'conditionnement')
                : unitLabel(basis, article.productVariant)),
    };
};

export {
    supplierPackagingLabel,
    supplierPackagingPresentation,
    supplierSourcePriceLabel,
    supplierTariffPresentation,
};
