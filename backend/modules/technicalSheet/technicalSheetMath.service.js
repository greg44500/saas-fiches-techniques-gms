import {
    PRODUCT_REFERENCE_UNIT_REGISTRY,
} from '../productCatalog/productCatalog.registry.js';
import {
    parseDecimalFraction,
    rationalToDecimal128String,
} from '../supplierCatalog/supplierPriceMath.service.js';

const absBigInt = (value) => (
    value < 0n ? -value : value
);

const gcd = (left, right) => {
    let a = absBigInt(left);
    let b = absBigInt(right);

    while (b !== 0n) {
        const next = a % b;
        a = b;
        b = next;
    }

    return a || 1n;
};

const normalizeFraction = ({
    numerator,
    denominator,
}) => {
    if (denominator === 0n) {
        throw new TypeError(
            'Fraction denominator cannot be zero',
        );
    }

    let n = numerator;
    let d = denominator;

    if (d < 0n) {
        n = -n;
        d = -d;
    }

    const divisor = gcd(n, d);

    return {
        numerator: n / divisor,
        denominator: d / divisor,
    };
};

const decimalFraction = (value) =>
    normalizeFraction(parseDecimalFraction(value));

const addFractions = (left, right) =>
    normalizeFraction({
        numerator:
            left.numerator * right.denominator
            + right.numerator * left.denominator,
        denominator:
            left.denominator * right.denominator,
    });

const subtractFractions = (left, right) =>
    normalizeFraction({
        numerator:
            left.numerator * right.denominator
            - right.numerator * left.denominator,
        denominator:
            left.denominator * right.denominator,
    });

const multiplyFractions = (left, right) =>
    normalizeFraction({
        numerator: left.numerator * right.numerator,
        denominator: left.denominator * right.denominator,
    });

const divideFractions = (left, right) => {
    if (right.numerator === 0n) {
        throw new TypeError('Cannot divide by zero');
    }

    return normalizeFraction({
        numerator: left.numerator * right.denominator,
        denominator: left.denominator * right.numerator,
    });
};

const fractionToDecimal = (value) =>
    rationalToDecimal128String(value);

const getUnitDefinition = (unit) => {
    const definition =
        PRODUCT_REFERENCE_UNIT_REGISTRY[unit];

    if (!definition) {
        throw new TypeError(
            'Unité de Référence Produit inconnue.',
        );
    }

    return definition;
};

const convertQuantity = ({
    quantity,
    fromUnit,
    toUnit,
}) => {
    const from = getUnitDefinition(fromUnit);
    const to = getUnitDefinition(toUnit);

    if (from.dimension !== to.dimension) {
        return null;
    }

    const parsed = decimalFraction(quantity);

    return normalizeFraction({
        numerator:
            parsed.numerator
            * BigInt(from.factorToBase),
        denominator:
            parsed.denominator
            * BigInt(to.factorToBase),
    });
};

const calculateGrossQuantity = ({
    netQuantity,
    yieldPercent = null,
}) => {
    const net = decimalFraction(netQuantity);

    if (yieldPercent === null || yieldPercent === undefined) {
        return {
            yieldPercentUsed: null,
            grossQuantity: net,
        };
    }

    const yieldFraction = decimalFraction(yieldPercent);

    if (
        yieldFraction.numerator <= 0n
        || yieldFraction.numerator
            > yieldFraction.denominator * 100n
    ) {
        throw new TypeError(
            'Le rendement doit être strictement supérieur à 0 et inférieur ou égal à 100.',
        );
    }

    return {
        yieldPercentUsed: yieldFraction,
        grossQuantity: divideFractions(
            net,
            divideFractions(
                yieldFraction,
                decimalFraction('100'),
            ),
        ),
    };
};

const sumFractions = (values) => values.reduce(
    (total, value) => addFractions(total, value),
    { numerator: 0n, denominator: 1n },
);

const divideRoundedHalfEven = (
    numerator,
    denominator,
) => {
    if (denominator <= 0n) {
        throw new TypeError(
            'Round denominator must be positive',
        );
    }

    const negative = numerator < 0n;
    const absolute = negative ? -numerator : numerator;
    const quotient = absolute / denominator;
    const remainder = absolute % denominator;
    const doubled = remainder * 2n;
    let rounded = quotient;

    if (
        doubled > denominator
        || (
            doubled === denominator
            && quotient % 2n !== 0n
        )
    ) {
        rounded += 1n;
    }

    return negative ? -rounded : rounded;
};

const ceilPositiveFraction = ({
    numerator,
    denominator,
}) => {
    if (numerator < 0n || denominator <= 0n) {
        throw new TypeError(
            'Ceil requires a non-negative fraction',
        );
    }

    return numerator / denominator
        + (numerator % denominator === 0n ? 0n : 1n);
};

const calculateEconomics = ({
    ingredientCosts,
    economatCosts,
    vatRateBasisPoints,
    targetMarginBasisPoints,
    finalPriceTtcMinor = null,
    finalPriceMode,
}) => {
    if (
        !Number.isInteger(vatRateBasisPoints)
        || vatRateBasisPoints < 0
        || vatRateBasisPoints > 10000
    ) {
        throw new TypeError('TVA invalide.');
    }

    if (
        !Number.isInteger(targetMarginBasisPoints)
        || targetMarginBasisPoints < 0
        || targetMarginBasisPoints >= 10000
    ) {
        throw new TypeError('Marge cible invalide.');
    }

    const materialCostHt = sumFractions(ingredientCosts);
    const economatCostHt = sumFractions(economatCosts);
    const manufacturingCostHt =
        addFractions(materialCostHt, economatCostHt);

    const theoreticalPriceHt = multiplyFractions(
        manufacturingCostHt,
        {
            numerator: 10000n,
            denominator:
                BigInt(10000 - targetMarginBasisPoints),
        },
    );

    const vatFactor = normalizeFraction({
        numerator: BigInt(10000 + vatRateBasisPoints),
        denominator: 10000n,
    });

    const theoreticalPriceTtc =
        multiplyFractions(theoreticalPriceHt, vatFactor);
    const theoreticalTtcCents =
        multiplyFractions(
            theoreticalPriceTtc,
            { numerator: 100n, denominator: 1n },
        );
    const centsCeil =
        ceilPositiveFraction(theoreticalTtcCents);
    const advisedMinorBigInt =
        centsCeil % 50n === 0n
            ? centsCeil
            : centsCeil + (50n - centsCeil % 50n);
    const advisedPriceTtcMinor =
        Number(advisedMinorBigInt);

    const economicFloorTtc =
        multiplyFractions(
            manufacturingCostHt,
            vatFactor,
        );

    const finalMinor =
        finalPriceMode === 'MANUAL'
            ? finalPriceTtcMinor
            : advisedPriceTtcMinor;

    if (!Number.isInteger(finalMinor) || finalMinor < 0) {
        throw new TypeError(
            'Prix final TTC invalide.',
        );
    }

    const finalTtc = normalizeFraction({
        numerator: BigInt(finalMinor),
        denominator: 100n,
    });

    if (
        finalTtc.numerator * economicFloorTtc.denominator
        < economicFloorTtc.numerator * finalTtc.denominator
    ) {
        const error = new RangeError(
            'Le Prix final TTC est inférieur au plancher économique.',
        );
        error.code =
            'TECHNICAL_SHEET_FINAL_PRICE_BELOW_FLOOR';
        throw error;
    }

    const finalPriceHt =
        divideFractions(finalTtc, vatFactor);
    const actualMarginAmountHt =
        subtractFractions(
            finalPriceHt,
            manufacturingCostHt,
        );
    const actualMarginBasisPoints =
        finalPriceHt.numerator === 0n
            ? 0
            : Number(divideRoundedHalfEven(
                actualMarginAmountHt.numerator
                    * finalPriceHt.denominator
                    * 10000n,
                actualMarginAmountHt.denominator
                    * finalPriceHt.numerator,
            ));

    return {
        materialCostHt:
            fractionToDecimal(materialCostHt),
        economatCostHt:
            fractionToDecimal(economatCostHt),
        manufacturingCostHt:
            fractionToDecimal(manufacturingCostHt),
        theoreticalPriceHt:
            fractionToDecimal(theoreticalPriceHt),
        theoreticalPriceTtc:
            fractionToDecimal(theoreticalPriceTtc),
        advisedPriceTtcMinor,
        finalPriceHt:
            fractionToDecimal(finalPriceHt),
        finalPriceTtcMinor: finalMinor,
        actualMarginAmountHt:
            fractionToDecimal(actualMarginAmountHt),
        actualMarginBasisPoints,
        economicFloorTtc:
            fractionToDecimal(economicFloorTtc),
    };
};

export {
    addFractions,
    calculateEconomics,
    calculateGrossQuantity,
    convertQuantity,
    decimalFraction,
    divideFractions,
    fractionToDecimal,
    multiplyFractions,
    normalizeFraction,
    sumFractions,
};
