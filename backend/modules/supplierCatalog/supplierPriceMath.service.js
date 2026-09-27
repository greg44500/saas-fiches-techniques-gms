import {
    PRODUCT_REFERENCE_UNIT_REGISTRY,
} from '../productCatalog/productCatalog.registry.js';

const DECIMAL128_SIGNIFICANT_DIGITS = 34;

const pow10 = (exponent) => 10n ** BigInt(exponent);

const parseDecimalFraction = (value) => {
    const text = String(value).trim();

    if (!/^-?\d+(?:\.\d+)?$/.test(text)) {
        throw new TypeError('Invalid decimal value');
    }

    const negative = text.startsWith('-');
    const unsigned = negative ? text.slice(1) : text;
    const [whole, fraction = ''] = unsigned.split('.');
    const numerator = BigInt((whole || '0') + fraction);

    return {
        numerator: negative ? -numerator : numerator,
        denominator: pow10(fraction.length),
    };
};

const countDigits = (value) => (
    value === 0n ? 1 : value.toString().replace('-', '').length
);

const divideRoundedHalfEven = (numerator, denominator) => {
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    const doubled = remainder * 2n;

    if (doubled < denominator) return quotient;
    if (doubled > denominator) return quotient + 1n;

    return quotient % 2n === 0n
        ? quotient
        : quotient + 1n;
};

const rationalToDecimal128String = ({
    numerator,
    denominator,
}) => {
    if (denominator <= 0n) {
        throw new TypeError('Decimal denominator must be positive');
    }

    if (numerator === 0n) return '0';

    const negative = numerator < 0n;
    let absoluteNumerator = negative ? -numerator : numerator;
    const integerPart = absoluteNumerator / denominator;
    const integerDigits = integerPart === 0n
        ? 0
        : countDigits(integerPart);

    let leadingFractionZeros = 0;

    if (integerPart === 0n) {
        let remainder = absoluteNumerator % denominator;

        while (
            remainder !== 0n
            && leadingFractionZeros < 80
        ) {
            remainder *= 10n;
            const digit = remainder / denominator;

            if (digit !== 0n) break;

            leadingFractionZeros += 1;
            remainder %= denominator;
        }
    }

    const fractionalDigits = integerDigits > 0
        ? Math.max(
            0,
            DECIMAL128_SIGNIFICANT_DIGITS - integerDigits,
        )
        : leadingFractionZeros
            + DECIMAL128_SIGNIFICANT_DIGITS;

    const scale = pow10(fractionalDigits);
    const scaled = divideRoundedHalfEven(
        absoluteNumerator * scale,
        denominator,
    );

    let raw = scaled.toString();

    if (fractionalDigits === 0) {
        return (negative ? '-' : '') + raw;
    }

    raw = raw.padStart(fractionalDigits + 1, '0');

    const whole = raw.slice(0, -fractionalDigits) || '0';
    const fraction = raw.slice(-fractionalDigits)
        .replace(/0+$/, '');

    return (negative ? '-' : '')
        + whole
        + (fraction ? '.' + fraction : '');
};

const getUnitDefinition = (unit) => (
    PRODUCT_REFERENCE_UNIT_REGISTRY[unit] ?? null
);

const normalizeSupplierPrice = ({
    sourceAmount,
    sourceBasis,
    packaging = null,
    targetUnit,
}) => {
    const targetDefinition = getUnitDefinition(targetUnit);

    if (!targetDefinition) {
        return {
            normalizedAmount: null,
            normalizedUnit: null,
        };
    }

    const amount = parseDecimalFraction(sourceAmount);

    if (sourceBasis !== 'PACKAGE') {
        const sourceDefinition =
            getUnitDefinition(sourceBasis);

        if (
            !sourceDefinition
            || sourceDefinition.dimension
                !== targetDefinition.dimension
        ) {
            return {
                normalizedAmount: null,
                normalizedUnit: null,
            };
        }

        return {
            normalizedAmount:
                rationalToDecimal128String({
                    numerator:
                        amount.numerator
                        * BigInt(
                            targetDefinition.factorToBase,
                        ),
                    denominator:
                        amount.denominator
                        * BigInt(
                            sourceDefinition.factorToBase,
                        ),
                }),
            normalizedUnit: targetUnit,
        };
    }

    if (
        !packaging?.totalQuantity
        || !packaging?.unit
    ) {
        return {
            normalizedAmount: null,
            normalizedUnit: null,
        };
    }

    const packagingDefinition =
        getUnitDefinition(packaging.unit);

    if (
        !packagingDefinition
        || packagingDefinition.dimension
            !== targetDefinition.dimension
    ) {
        return {
            normalizedAmount: null,
            normalizedUnit: null,
        };
    }

    const quantity =
        parseDecimalFraction(
            packaging.totalQuantity,
        );

    if (quantity.numerator <= 0n) {
        return {
            normalizedAmount: null,
            normalizedUnit: null,
        };
    }

    return {
        normalizedAmount:
            rationalToDecimal128String({
                numerator:
                    amount.numerator
                    * quantity.denominator
                    * BigInt(
                        targetDefinition.factorToBase,
                    ),
                denominator:
                    amount.denominator
                    * quantity.numerator
                    * BigInt(
                        packagingDefinition.factorToBase,
                    ),
            }),
        normalizedUnit: targetUnit,
    };
};

export {
    normalizeSupplierPrice,
    parseDecimalFraction,
    rationalToDecimal128String,
};
