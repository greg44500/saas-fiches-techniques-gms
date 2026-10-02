import {
    convertQuantity,
    fractionToDecimal,
} from './technicalSheetMath.service.js';

const decimalToString = (value) => (
    value === null || value === undefined
        ? null
        : value.toString()
);

const serializeTechnicalSheet = (sheet) => ({
    id: sheet._id.toString(),
    workspaceId: sheet.workspace.toString(),
    dossierId: sheet.dossier.toString(),
    name: sheet.name,
    description: sheet.description ?? null,
    status: sheet.status,
    statusChangedAt: sheet.statusChangedAt,
    currentValidatedStateId:
        sheet.currentValidatedState?.toString() ?? null,
    copyOrigin: sheet.copyOrigin
        ? {
            sourceTechnicalSheetId:
                sheet.copyOrigin.sourceTechnicalSheet
                    ?.toString() ?? null,
            sourceDossierId:
                sheet.copyOrigin.sourceDossier
                    ?.toString() ?? null,
            copiedAt: sheet.copyOrigin.copiedAt ?? null,
        }
        : null,
    deletedAt: sheet.deletedAt ?? null,
    purgeScheduledAt: sheet.purgeScheduledAt ?? null,
    revision: sheet.revision,
    createdAt: sheet.createdAt,
    updatedAt: sheet.updatedAt,
});

const normalizeSerializedQuantity = ({
    quantity,
    fromUnit,
    toUnit,
}) => {
    const serialized =
        decimalToString(quantity);

    if (
        serialized === null
        || !fromUnit
        || !toUnit
        || fromUnit === toUnit
    ) {
        return serialized;
    }

    const converted = convertQuantity({
        quantity: serialized,
        fromUnit,
        toUnit,
    });

    return converted
        ? fractionToDecimal(converted)
        : serialized;
};

const serializeLine = (line) => {
    const referenceUnit =
        line.productVariant?.referenceUnit
        ?? line.inputUnit;
    const serializedNetQuantity =
        normalizeSerializedQuantity({
            quantity: line.netQuantity,
            fromUnit: line.inputUnit,
            toUnit: referenceUnit,
        });
    const serializedGrossQuantity =
        normalizeSerializedQuantity({
            quantity:
                line.calculation?.grossQuantity,
            fromUnit:
                line.calculation?.grossUnit
                ?? line.inputUnit,
            toUnit: referenceUnit,
        });

    return {
        id: line._id.toString(),
        kind: line.kind,
        productVariantId:
            (
                line.productVariant?._id
                ?? line.productVariant
            ).toString(),
        productVariant:
            line.productVariant?._id
                ? {
                    id: line.productVariant._id.toString(),
                    name: line.productVariant.name,
                    referenceUnit:
                        line.productVariant.referenceUnit,
                    yieldPercent:
                        line.productVariant.yieldPercent ?? null,
                    status: line.productVariant.status,
                }
                : null,
        netQuantity:
            serializedNetQuantity,
        inputUnit:
            referenceUnit,
        order: line.order,
        note: line.note ?? null,
        selectedSupplierArticleId:
            line.selectedSupplierArticle?.toString() ?? null,
        calculation: {
            yieldPercentUsed:
                decimalToString(
                    line.calculation?.yieldPercentUsed,
                ),
            grossQuantity:
                serializedGrossQuantity,
            grossUnit:
                referenceUnit ?? null,
        },
        valuation: {
            status: line.valuation?.status,
            supplierArticleId:
                line.valuation?.supplierArticleId
                    ?.toString() ?? null,
            applicableSource:
                line.valuation?.applicableSource ?? null,
            applicableSourceId:
                line.valuation?.applicableSourceId ?? null,
            normalizedAmount:
                decimalToString(
                    line.valuation?.normalizedAmount,
                ),
            normalizedUnit:
                line.valuation?.normalizedUnit ?? null,
            lineCostHt:
                decimalToString(
                    line.valuation?.lineCostHt,
                ),
            materialCostSharePercent:
                decimalToString(
                    line.valuation
                        ?.materialCostSharePercent,
                ),
            pricedAt:
                line.valuation?.pricedAt ?? null,
            alerts:
                line.valuation?.alerts ?? [],
        },
    };
};

const serializeTechnicalSheetDraft = (draft) => ({
    id: draft._id.toString(),
    technicalSheetId:
        draft.technicalSheet.toString(),
    revision: draft.revision,
    productionQuantity:
        decimalToString(draft.productionQuantity),
    productionUnit: draft.productionUnit ?? null,
    portionsPerProductionUnit:
        decimalToString(
            draft.portionsPerProductionUnit,
        ),
    totalPortions:
        draft.economicSnapshot
            ?.totalPortions
        ?? null,
    saleBasis: draft.saleBasis ?? null,
    vatRateBasisPoints:
        draft.vatRateBasisPoints ?? null,
    targetMarginBasisPoints:
        draft.targetMarginBasisPoints ?? null,
    finalPriceTtcMinor:
        draft.finalPriceTtcMinor ?? null,
    finalPriceMode: draft.finalPriceMode,
    lines: draft.lines.map(serializeLine),
    valuationStatus: draft.valuationStatus,
    valuedAt: draft.valuedAt ?? null,
    valuationFingerprint:
        draft.valuationFingerprint ?? null,
    economicSnapshot:
        draft.economicSnapshot ?? null,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
});

const serializeTechnicalSheetValidation = (
    validation,
) => ({
    id: validation._id.toString(),
    technicalSheetId:
        validation.technicalSheet.toString(),
    validatedAt: validation.validatedAt,
    validatedById:
        validation.validatedBy.toString(),
    comment: validation.comment ?? null,
    changeKinds: validation.changeKinds ?? [],
    sheetSnapshot: validation.sheetSnapshot,
    linesSnapshot: validation.linesSnapshot,
    economicSnapshot: validation.economicSnapshot,
    valuationFingerprint:
        validation.valuationFingerprint,
    createdAt: validation.createdAt,
});

export {
    decimalToString,
    serializeTechnicalSheet,
    serializeTechnicalSheetDraft,
    serializeTechnicalSheetValidation,
};
