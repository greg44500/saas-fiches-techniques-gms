import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    TECHNICAL_SHEET_LINE_KIND,
} from './technicalSheet.registry.js';
import {
    calculateGrossQuantity,
    convertQuantity,
    decimalFraction,
    fractionToDecimal,
    multiplyFractions,
    sumFractions,
} from './technicalSheetMath.service.js';
import { AppError } from '../../utils/appError.js';

const toObjectId = (value) => (
    value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(value)
);

const resolveProductVariants = async ({
    lines,
    session = null,
}) => {
    const ids = [
        ...new Set(
            lines.map(
                (line) =>
                    line.productVariantId
                    ?? line.productVariant?.toString(),
            ),
        ),
    ];

    let query = ProductVariant.find({
        _id: {
            $in: ids.map(toObjectId),
        },
        status: PRODUCT_STATUS.ACTIVE,
        identityActive: true,
    }).select(
        '_id name referenceUnit yieldPercent status identityActive',
    );

    if (session) {
        query = query.session(session);
    }

    const variants = await query;
    const byId = new Map(
        variants.map((variant) => [
            variant._id.toString(),
            variant,
        ]),
    );

    if (byId.size !== ids.length) {
        throw new AppError(
            'Une ou plusieurs Références Produit sont indisponibles.',
            409,
        );
    }

    return byId;
};

const assertCompatibleUnit = (
    inputUnit,
    referenceUnit,
) => {
    const input =
        PRODUCT_REFERENCE_UNIT_REGISTRY[inputUnit];
    const reference =
        PRODUCT_REFERENCE_UNIT_REGISTRY[referenceUnit];

    if (
        !input
        || !reference
        || input.dimension !== reference.dimension
    ) {
        throw new AppError(
            'Conversion impossible entre les unités de la ligne et de la Référence Produit.',
            409,
        );
    }
};

const prepareTechnicalSheetComposition = async ({
    lines,
    session = null,
}) => {
    const variants = await resolveProductVariants({
        lines,
        session,
    });

    const prepared = lines.map((line, index) => {
        const productVariantId =
            line.productVariantId
            ?? line.productVariant?.toString();
        const variant =
            variants.get(productVariantId.toString());

        assertCompatibleUnit(
            line.inputUnit,
            variant.referenceUnit,
        );

        const gross =
            calculateGrossQuantity({
                netQuantity: line.netQuantity,
                yieldPercent:
                    variant.yieldPercent ?? null,
            });

        return {
            _id:
                line.id
                ?? line._id
                ?? new mongoose.Types.ObjectId(),
            kind: line.kind,
            productVariant: variant._id,
            netQuantity:
                line.netQuantity.toString(),
            inputUnit: line.inputUnit,
            order: line.order ?? index,
            note: line.note ?? null,
            selectedSupplierArticle:
                line.selectedSupplierArticleId
                ?? line.selectedSupplierArticle
                ?? null,
            calculation: {
                yieldPercentUsed:
                    gross.yieldPercentUsed
                        ? fractionToDecimal(
                            gross.yieldPercentUsed,
                        )
                        : null,
                grossQuantity:
                    fractionToDecimal(
                        gross.grossQuantity,
                    ),
                grossUnit: line.inputUnit,
                recipePercent: null,
            },
            valuation:
                line.valuation?.toObject?.()
                ?? line.valuation
                ?? undefined,
            productVariantSnapshot: variant,
        };
    });

    const ingredientLines = prepared.filter(
        (line) =>
            line.kind
            === TECHNICAL_SHEET_LINE_KIND.INGREDIENT,
    );

    const ingredientDimensions = new Set(
        ingredientLines.map((line) =>
            PRODUCT_REFERENCE_UNIT_REGISTRY[
                line.inputUnit
            ].dimension),
    );

    if (
        ingredientLines.length > 0
        && ingredientDimensions.size === 1
    ) {
        const baseQuantities =
            ingredientLines.map((line) => {
                const definition =
                    PRODUCT_REFERENCE_UNIT_REGISTRY[
                        line.inputUnit
                    ];

                return multiplyFractions(
                    decimalFraction(line.netQuantity),
                    {
                        numerator:
                            BigInt(definition.factorToBase),
                        denominator: 1n,
                    },
                );
            });
        const total =
            sumFractions(baseQuantities);

        if (total.numerator > 0n) {
            let ingredientIndex = 0;

            for (const line of prepared) {
                if (
                    line.kind
                    !== TECHNICAL_SHEET_LINE_KIND.INGREDIENT
                ) {
                    continue;
                }

                const percent = multiplyFractions(
                    {
                        numerator:
                            baseQuantities[
                                ingredientIndex
                            ].numerator
                            * total.denominator,
                        denominator:
                            baseQuantities[
                                ingredientIndex
                            ].denominator
                            * total.numerator,
                    },
                    {
                        numerator: 100n,
                        denominator: 1n,
                    },
                );

                line.calculation.recipePercent =
                    fractionToDecimal(percent);
                ingredientIndex += 1;
            }
        }
    }

    return {
        lines: prepared,
        variants,
        recipePercentAvailable:
            ingredientLines.length === 0
            || ingredientDimensions.size === 1,
    };
};

const convertGrossForPrice = ({
    line,
    normalizedUnit,
}) => {
    const converted = convertQuantity({
        quantity:
            line.calculation.grossQuantity,
        fromUnit:
            line.calculation.grossUnit,
        toUnit: normalizedUnit,
    });

    if (!converted) {
        throw new AppError(
            'Le Prix applicable utilise une unité incompatible avec la Fiche technique.',
            409,
        );
    }

    return converted;
};

export {
    convertGrossForPrice,
    prepareTechnicalSheetComposition,
    resolveProductVariants,
};
