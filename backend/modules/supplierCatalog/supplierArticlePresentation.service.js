import { PRODUCT_REFERENCE_UNIT_REGISTRY } from '../productCatalog/productCatalog.registry.js';
import {
    normalizeSupplierPrice,
    parseDecimalFraction,
    rationalToDecimal128String,
} from './supplierPriceMath.service.js';

const unitLabel = (unit, variant = null) => unit === 'UNIT'
    ? (variant?.countUnitLabelSingular || 'unité')
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

const supplierPackagingLabel = (packaging, productVariant = null) => {
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
    if (packaging.netWeight && packaging.netWeightUnit
        && !(packaging.totalQuantity && packaging.unit && comparableAmounts(
            packaging.netWeight, packaging.netWeightUnit,
            packaging.totalQuantity, packaging.unit,
        ))) {
        parts.push('net ' + printQuantity(packaging.netWeight)
            + ' ' + unitLabel(packaging.netWeightUnit));
    }
    if (packaging.drainedNetWeight && packaging.drainedNetWeightUnit) {
        parts.push('égoutté ' + printQuantity(packaging.drainedNetWeight)
            + ' ' + unitLabel(packaging.drainedNetWeightUnit));
    }
    return parts.join(' · ') || 'Non renseigné';
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
    const packaging = article.packaging;
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
    }) : { normalizedAmount: null, normalizedUnit: null };
    const amountOfPackage = packagePriceAmount({
        amount: tariff.sourceAmount, basis, packaging,
    });
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

export { supplierPackagingLabel, supplierSourcePriceLabel, supplierTariffPresentation };
