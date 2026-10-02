import {
    PRODUCT_REFERENCE_UNIT_REGISTRY,
} from '../productCatalog/productCatalog.registry.js';
import {
    parseDecimalFraction,
    rationalToDecimal128String,
} from '../supplierCatalog/supplierPriceMath.service.js';
import {
    TECHNICAL_SHEET_SALE_BASIS,
} from './technicalSheet.registry.js';

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

const calculateTotalPortions = ({
    productionQuantity,
    portionsPerProductionUnit,
}) => {
    const productionQuantityFraction =
        decimalFraction(productionQuantity);
    const portionsPerProductionUnitFraction =
        decimalFraction(portionsPerProductionUnit);

    if (
        productionQuantityFraction.numerator <= 0n
        || portionsPerProductionUnitFraction.numerator <= 0n
    ) {
        throw new TypeError(
            'La quantité produite et les portions par pièce doivent être strictement positives.',
        );
    }

    return fractionToDecimal(
        multiplyFractions(
            productionQuantityFraction,
            portionsPerProductionUnitFraction,
        ),
    );
};

const calculateEconomics = ({
    ingredientCosts,
    economatCosts,
    productionQuantity,
    portionsPerProductionUnit = '1',
    saleBasis = TECHNICAL_SHEET_SALE_BASIS.PIECE,
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
    const productionQuantityFraction =
        decimalFraction(productionQuantity);
    const portionsPerProductionUnitFraction =
        decimalFraction(portionsPerProductionUnit);

    if (productionQuantityFraction.numerator <= 0n) {
        throw new TypeError(
            'La quantité produite doit être strictement positive.',
        );
    }

    if (
        portionsPerProductionUnitFraction.numerator <= 0n
    ) {
        throw new TypeError(
            'Le nombre de portions par pièce doit être strictement positif.',
        );
    }

    if (
        !Object.values(
            TECHNICAL_SHEET_SALE_BASIS,
        ).includes(saleBasis)
    ) {
        throw new TypeError(
            'Base de vente invalide.',
        );
    }

    const totalPortions =
        multiplyFractions(
            productionQuantityFraction,
            portionsPerProductionUnitFraction,
        );

    const materialCostPerProductionUnitHt =
        divideFractions(
            materialCostHt,
            productionQuantityFraction,
        );
    const economatCostPerProductionUnitHt =
        divideFractions(
            economatCostHt,
            productionQuantityFraction,
        );
    const manufacturingCostPerProductionUnitHt =
        divideFractions(
            manufacturingCostHt,
            productionQuantityFraction,
        );
    const materialCostPerPortionHt =
        divideFractions(
            materialCostHt,
            totalPortions,
        );
    const economatCostPerPortionHt =
        divideFractions(
            economatCostHt,
            totalPortions,
        );
    const manufacturingCostPerPortionHt =
        divideFractions(
            manufacturingCostHt,
            totalPortions,
        );
    const saleCostHt =
        saleBasis
        === TECHNICAL_SHEET_SALE_BASIS.PORTION
            ? manufacturingCostPerPortionHt
            : manufacturingCostPerProductionUnitHt;

    const theoreticalPriceHt = multiplyFractions(
        saleCostHt,
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
            saleCostHt,
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

    const finalPriceHt =
        divideFractions(finalTtc, vatFactor);
    const actualMarginAmountHt =
        subtractFractions(
            finalPriceHt,
            saleCostHt,
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
    const saleUnitCount =
        saleBasis
        === TECHNICAL_SHEET_SALE_BASIS.PORTION
            ? totalPortions
            : productionQuantityFraction;
    const manufacturingMarginProductionHt =
        multiplyFractions(
            actualMarginAmountHt,
            saleUnitCount,
        );
    const targetMarginDeltaBasisPoints =
        actualMarginBasisPoints
        - targetMarginBasisPoints;
    const targetMarginDeltaAmountHt =
        subtractFractions(
            finalPriceHt,
            theoreticalPriceHt,
        );
    const targetMarginDeltaProductionHt =
        multiplyFractions(
            targetMarginDeltaAmountHt,
            saleUnitCount,
        );

    return {
        materialCostHt:
            fractionToDecimal(materialCostHt),
        economatCostHt:
            fractionToDecimal(economatCostHt),
        manufacturingCostHt:
            fractionToDecimal(manufacturingCostHt),
        materialCostPerProductionUnitHt:
            fractionToDecimal(
                materialCostPerProductionUnitHt,
            ),
        economatCostPerProductionUnitHt:
            fractionToDecimal(
                economatCostPerProductionUnitHt,
            ),
        manufacturingCostPerProductionUnitHt:
            fractionToDecimal(
                manufacturingCostPerProductionUnitHt,
            ),
        totalPortions:
            fractionToDecimal(totalPortions),
        materialCostPerPortionHt:
            fractionToDecimal(
                materialCostPerPortionHt,
            ),
        economatCostPerPortionHt:
            fractionToDecimal(
                economatCostPerPortionHt,
            ),
        manufacturingCostPerPortionHt:
            fractionToDecimal(
                manufacturingCostPerPortionHt,
            ),
        saleBasis,
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
        manufacturingMarginProductionHt:
            fractionToDecimal(
                manufacturingMarginProductionHt,
            ),
        actualMarginBasisPoints,
        targetMarginDeltaBasisPoints,
        targetMarginDeltaAmountHt:
            fractionToDecimal(
                targetMarginDeltaAmountHt,
            ),
        targetMarginDeltaProductionHt:
            fractionToDecimal(
                targetMarginDeltaProductionHt,
            ),
        economicFloorTtc:
            fractionToDecimal(economicFloorTtc),
    };
};

export {
    addFractions,
    calculateEconomics,
    calculateGrossQuantity,
    calculateTotalPortions,
    convertQuantity,
    decimalFraction,
    divideFractions,
    fractionToDecimal,
    multiplyFractions,
    normalizeFraction,
    sumFractions,
};
