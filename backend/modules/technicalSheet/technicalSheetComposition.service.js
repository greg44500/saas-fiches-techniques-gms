import mongoose from 'mongoose';

import {
    PRODUCT_REFERENCE_UNIT_REGISTRY,
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    buildWorkspaceGovernanceVisibilityFilter,
} from '../productCatalog/productReferenceGovernance.service.js';
import {
    calculateGrossQuantity,
    convertQuantity,
    fractionToDecimal,
} from './technicalSheetMath.service.js';
import { AppError } from '../../utils/appError.js';

const toObjectId = (value) => (
    value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(value)
);

const resolveProductVariants = async ({
    lines,
    workspaceId,
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

    let query = ProductVariant.find(
        mongoose.trusted({
            _id: mongoose.trusted({
                $in: ids.map(toObjectId),
            }),
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
            ...buildWorkspaceGovernanceVisibilityFilter(workspaceId),
        }),
    ).select(
        '_id name referenceUnit countUnitLabelSingular countUnitLabelPlural yieldPercent status identityActive',
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

const normalizeLineQuantity = ({
    netQuantity,
    inputUnit,
    referenceUnit,
}) => {
    const sourceUnit =
        inputUnit ?? referenceUnit;
    const source =
        PRODUCT_REFERENCE_UNIT_REGISTRY[sourceUnit];
    const reference =
        PRODUCT_REFERENCE_UNIT_REGISTRY[referenceUnit];

    if (
        !source
        || !reference
        || source.dimension !== reference.dimension
    ) {
        throw new AppError(
            'Conversion impossible entre l’unité historique de la ligne et l’unité de référence du Produit.',
            409,
        );
    }

    if (sourceUnit === referenceUnit) {
        return netQuantity.toString();
    }

    const converted = convertQuantity({
        quantity: netQuantity,
        fromUnit: sourceUnit,
        toUnit: referenceUnit,
    });

    if (!converted) {
        throw new AppError(
            'La quantité de la ligne ne peut pas être normalisée dans l’unité de référence du Produit.',
            409,
        );
    }

    return fractionToDecimal(converted);
};

const prepareTechnicalSheetComposition = async ({
    lines,
    workspaceId,
    session = null,
}) => {
    const variants = await resolveProductVariants({
        lines,
        workspaceId,
        session,
    });

    const prepared = lines.map((line, index) => {
        const productVariantId =
            line.productVariantId
            ?? line.productVariant?.toString();
        const variant =
            variants.get(productVariantId.toString());

        const normalizedNetQuantity =
            normalizeLineQuantity({
                netQuantity:
                    line.netQuantity,
                inputUnit:
                    line.inputUnit,
                referenceUnit:
                    variant.referenceUnit,
            });

        const gross =
            calculateGrossQuantity({
                netQuantity:
                    normalizedNetQuantity,
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
                normalizedNetQuantity,
            inputUnit:
                variant.referenceUnit,
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
                grossUnit:
                    variant.referenceUnit,
            },
            valuation:
                line.valuation?.toObject?.()
                ?? line.valuation
                ?? undefined,
            productVariantSnapshot: variant,
        };
    });

    return {
        lines: prepared,
        variants,
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
