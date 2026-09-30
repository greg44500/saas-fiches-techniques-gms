import {
    createHash,
} from 'node:crypto';
import mongoose from 'mongoose';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../businessActivity/businessActivity.registry.js';
import {
    resolveApplicablePrice,
} from '../supplierCatalog/supplierPricing.service.js';
import {
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_LINE_KIND,
    TECHNICAL_SHEET_LINE_VALUATION_STATUS,
    TECHNICAL_SHEET_VALUATION_STATUS,
} from './technicalSheet.registry.js';
import {
    TechnicalSheet,
} from './technicalSheet.model.js';
import {
    TechnicalSheetDraft,
} from './technicalSheetDraft.model.js';
import {
    convertGrossForPrice,
    prepareTechnicalSheetComposition,
} from './technicalSheetComposition.service.js';
import {
    decimalFraction,
    divideFractions,
    fractionToDecimal,
    multiplyFractions,
    calculateEconomics,
} from './technicalSheetMath.service.js';
import {
    createTechnicalSheetEvent,
} from './technicalSheetEvent.service.js';
import {
    serializeTechnicalSheetDraft,
} from './technicalSheet.serializer.js';
import {
    assertOperationalDossier,
} from './technicalSheet.service.js';
import { AppError } from '../../utils/appError.js';

const stableFingerprint = (value) =>
    createHash('sha256')
        .update(JSON.stringify(value))
        .digest('hex');

const emptyLineValuation = ({
    status,
    alerts,
}) => ({
    status,
    supplierArticleId: null,
    applicableSource: null,
    applicableSourceId: null,
    normalizedAmount: null,
    normalizedUnit: null,
    lineCostHt: null,
    materialCostSharePercent: null,
    pricedAt: null,
    sourceFingerprint: null,
    alerts,
});

const buildTechnicalSheetValuation = async ({
    workspaceId,
    dossierId,
    draft,
    atDate = new Date(),
    session = null,
}) => {
    const prepared =
        await prepareTechnicalSheetComposition({
            workspaceId,
            lines: draft.lines,
            session,
        });

    const resolutionCandidates = {};
    const lineSnapshots = [];
    const ingredientCosts = [];
    const economatCosts = [];
    let complete = true;

    const lines = [];

    for (const line of prepared.lines) {
        const variant =
            line.productVariantSnapshot;

        let applicable;

        try {
            applicable =
                await resolveApplicablePrice({
                    workspaceId,
                    dossierId,
                    articleId:
                        line.selectedSupplierArticle
                            ?.toString()
                        ?? null,
                    productVariantId:
                        variant._id.toString(),
                    atDate,
                    session,
                });
        } catch (error) {
            complete = false;

            if (
                error.code
                === 'SUPPLIER_ARTICLE_SELECTION_REQUIRED'
            ) {
                resolutionCandidates[
                    line._id.toString()
                ] = error.candidates ?? [];

                lines.push({
                    ...line,
                    productVariantSnapshot:
                        undefined,
                    valuation:
                        emptyLineValuation({
                            status:
                                TECHNICAL_SHEET_LINE_VALUATION_STATUS
                                    .UNRESOLVED,
                            alerts: [
                                'SUPPLIER_ARTICLE_SELECTION_REQUIRED',
                            ],
                        }),
                });
                continue;
            }

            if (error.statusCode === 404) {
                lines.push({
                    ...line,
                    productVariantSnapshot:
                        undefined,
                    valuation:
                        emptyLineValuation({
                            status:
                                TECHNICAL_SHEET_LINE_VALUATION_STATUS
                                    .UNRESOLVED,
                            alerts: [
                                'NO_USABLE_SUPPLIER_ARTICLE',
                            ],
                        }),
                });
                continue;
            }

            throw error;
        }

        if (
            applicable.article
            && applicable.article.productVariantId
                !== variant._id.toString()
        ) {
            throw new AppError(
                'L’Article fournisseur sélectionné ne correspond pas à la Référence Produit de la ligne.',
                409,
            );
        }

        const price = applicable.price;
        const indicativePrice = [
            'INDICATIVE_DOSSIER',
            'INDICATIVE_WORKSPACE',
        ].includes(
            applicable.resolvedSource,
        );
        const priceArticleId =
            indicativePrice
                ? null
                : applicable.article?.id
                    ?? null;
        const selectedSupplierArticle =
            indicativePrice
                ? line.selectedSupplierArticle
                    ?? null
                : priceArticleId;

        if (
            !price
            || !price.normalizedAmount
            || !price.normalizedUnit
        ) {
            complete = false;
            lines.push({
                ...line,
                selectedSupplierArticle,
                productVariantSnapshot:
                    undefined,
                valuation:
                    emptyLineValuation({
                        status:
                            TECHNICAL_SHEET_LINE_VALUATION_STATUS
                                .NO_PRICE,
                        alerts:
                            applicable.alerts?.length
                                ? applicable.alerts
                                : ['NO_APPLICABLE_PRICE'],
                    }),
            });
            continue;
        }

        const pricedQuantity =
            convertGrossForPrice({
                line,
                normalizedUnit:
                    price.normalizedUnit,
            });
        const lineCost =
            multiplyFractions(
                pricedQuantity,
                decimalFraction(
                    price.normalizedAmount,
                ),
            );
        const lineCostHt =
            fractionToDecimal(lineCost);
        const sourceFingerprint =
            stableFingerprint({
                articleId:
                    priceArticleId,
                source:
                    applicable.resolvedSource,
                sourceId: price.id,
                normalizedAmount:
                    price.normalizedAmount,
                normalizedUnit:
                    price.normalizedUnit,
                atDate:
                    atDate.toISOString(),
            });

        const valuedLine = {
            ...line,
            selectedSupplierArticle,
            productVariantSnapshot:
                undefined,
            valuation: {
                status:
                    TECHNICAL_SHEET_LINE_VALUATION_STATUS
                        .VALUED,
                supplierArticleId:
                    priceArticleId,
                applicableSource:
                    applicable.resolvedSource,
                applicableSourceId:
                    price.id,
                normalizedAmount:
                    price.normalizedAmount,
                normalizedUnit:
                    price.normalizedUnit,
                lineCostHt,
                materialCostSharePercent: null,
                pricedAt: atDate,
                sourceFingerprint,
                alerts:
                    applicable.alerts ?? [],
            },
        };

        lines.push(valuedLine);

        if (
            line.kind
            === TECHNICAL_SHEET_LINE_KIND.INGREDIENT
        ) {
            ingredientCosts.push(lineCost);
        } else {
            economatCosts.push(lineCost);
        }

        lineSnapshots.push({
            lineId: line._id.toString(),
            productVariant: {
                id: variant._id.toString(),
                name: variant.name,
                referenceUnit:
                    variant.referenceUnit,
                yieldPercent:
                    variant.yieldPercent ?? null,
            },
            article:
                indicativePrice
                    ? null
                    : applicable.article,
            price: {
                id: price.id,
                source:
                    applicable.resolvedSource,
                normalizedAmount:
                    price.normalizedAmount,
                normalizedUnit:
                    price.normalizedUnit,
            },
        });
    }

    const requiredDraftFieldsPresent =
        draft.productionQuantity !== null
        && draft.productionUnit !== null
        && draft.vatRateBasisPoints !== null
        && draft.targetMarginBasisPoints !== null
        && lines.length > 0;

    complete =
        complete
        && requiredDraftFieldsPresent
        && lines.every(
            (line) =>
                line.valuation.status
                === TECHNICAL_SHEET_LINE_VALUATION_STATUS
                    .VALUED,
        );

    let economics = null;

    if (complete) {
        try {
            economics = calculateEconomics({
                ingredientCosts,
                economatCosts,
                vatRateBasisPoints:
                    draft.vatRateBasisPoints,
                targetMarginBasisPoints:
                    draft.targetMarginBasisPoints,
                finalPriceTtcMinor:
                    draft.finalPriceTtcMinor,
                finalPriceMode:
                    draft.finalPriceMode
                    ?? TECHNICAL_SHEET_FINAL_PRICE_MODE
                        .ADVISED,
            });
        } catch (error) {
            if (
                error.code
                === 'TECHNICAL_SHEET_FINAL_PRICE_BELOW_FLOOR'
            ) {
                throw new AppError(
                    error.message,
                    409,
                );
            }

            throw error;
        }
    }

    if (
        complete
        && economics?.materialCostHt !== null
        && economics?.materialCostHt !== undefined
    ) {
        const materialCost =
            decimalFraction(economics.materialCostHt);

        if (materialCost.numerator > 0n) {
            for (const line of lines) {
                if (
                    line.kind
                    !== TECHNICAL_SHEET_LINE_KIND.INGREDIENT
                    || line.valuation?.lineCostHt === null
                    || line.valuation?.lineCostHt === undefined
                ) {
                    continue;
                }

                const share = multiplyFractions(
                    divideFractions(
                        decimalFraction(
                            line.valuation.lineCostHt,
                        ),
                        materialCost,
                    ),
                    {
                        numerator: 100n,
                        denominator: 1n,
                    },
                );

                line.valuation.materialCostSharePercent =
                    fractionToDecimal(share);
            }
        }
    }

    const fingerprint =
        complete
            ? stableFingerprint({
                productionQuantity:
                    draft.productionQuantity
                        ?.toString() ?? null,
                productionUnit:
                    draft.productionUnit,
                portions:
                    draft.portions
                        ?.toString() ?? null,
                vatRateBasisPoints:
                    draft.vatRateBasisPoints,
                targetMarginBasisPoints:
                    draft.targetMarginBasisPoints,
                finalPriceMode:
                    draft.finalPriceMode,
                finalPriceTtcMinor:
                    economics
                        ?.finalPriceTtcMinor
                    ?? draft.finalPriceTtcMinor,
                lines:
                    lines.map((line) => ({
                        id:
                            line._id.toString(),
                        kind: line.kind,
                        productVariantId:
                            (
                                line.productVariant
                                    ?._id
                                ?? line.productVariant
                            ).toString(),
                        netQuantity:
                            line.netQuantity.toString(),
                        inputUnit:
                            line.inputUnit,
                        yieldPercentUsed:
                            line.calculation
                                .yieldPercentUsed
                                ?.toString()
                            ?? null,
                        supplierArticleId:
                            line.valuation
                                .supplierArticleId
                                ?.toString()
                            ?? null,
                        source:
                            line.valuation
                                .applicableSource,
                        sourceId:
                            line.valuation
                                .applicableSourceId,
                        normalizedAmount:
                            line.valuation
                                .normalizedAmount
                                ?.toString()
                            ?? null,
                        normalizedUnit:
                            line.valuation
                                .normalizedUnit,
                    })),
            })
            : null;

    return {
        lines,
        valuationStatus:
            complete
                ? TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE
                : TECHNICAL_SHEET_VALUATION_STATUS.PARTIAL,
        valuedAt: atDate,
        valuationFingerprint: fingerprint,
        economicSnapshot: economics,
        resolutionCandidates,
        lineSnapshots,
    };
};

const valuateTechnicalSheet = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
    actorId,
    expectedRevision,
    atDate = new Date(),
}) => {
    await assertOperationalDossier({
        workspaceId,
        dossierId,
        session: null,
    });

    const sheet =
        await TechnicalSheet.findOne({
            _id: technicalSheetId,
            workspace: workspaceId,
            dossier: dossierId,
            status: 'ACTIVE',
        });

    if (!sheet) {
        throw new AppError(
            'Fiche technique indisponible pour la valorisation.',
            409,
        );
    }

    const current =
        await TechnicalSheetDraft.findOne({
            technicalSheet: technicalSheetId,
            workspace: workspaceId,
            dossier: dossierId,
            revision: expectedRevision,
        });

    if (!current) {
        throw new AppError(
            'Conflit de modification du brouillon.',
            409,
        );
    }

    const previousStatus =
        current.valuationStatus;
    const valuation =
        await buildTechnicalSheetValuation({
            workspaceId,
            dossierId,
            draft: current,
            atDate,
        });

    const persistedLines =
        valuation.lines.map((line) => ({
            ...line,
            productVariantSnapshot:
                undefined,
        }));

    const draft =
        await mongoose.connection.transaction(
            async (session) => {
                await assertOperationalDossier({
                    workspaceId,
                    dossierId,
                    session,
                });

                const updated =
                    await TechnicalSheetDraft
                        .findOneAndUpdate(
                            {
                                _id: current._id,
                                revision:
                                    expectedRevision,
                            },
                            {
                                $set: {
                                    lines:
                                        persistedLines,
                                    valuationStatus:
                                        valuation
                                            .valuationStatus,
                                    valuedAt:
                                        valuation.valuedAt,
                                    valuationFingerprint:
                                        valuation
                                            .valuationFingerprint,
                                    economicSnapshot:
                                        valuation
                                            .economicSnapshot,
                                    ...(valuation
                                        .economicSnapshot
                                        ? {
                                            finalPriceTtcMinor:
                                                valuation
                                                    .economicSnapshot
                                                    .finalPriceTtcMinor,
                                        }
                                        : {}),
                                    updatedBy:
                                        actorId,
                                },
                                $inc: {
                                    revision: 1,
                                },
                            },
                            {
                                returnDocument:
                                    'after',
                                runValidators: true,
                                session,
                            },
                        );

                if (!updated) {
                    throw new AppError(
                        'Conflit de modification du brouillon.',
                        409,
                    );
                }

                await createTechnicalSheetEvent({
                    workspaceId,
                    dossierId,
                    actorId,
                    action:
                        previousStatus
                        === TECHNICAL_SHEET_VALUATION_STATUS
                            .NOT_VALUED
                            ? BUSINESS_ACTIVITY_ACTION
                                .TECHNICAL_SHEET_VALUATED
                            : BUSINESS_ACTIVITY_ACTION
                                .TECHNICAL_SHEET_REVALUATED,
                    technicalSheetId,
                    metadata: {
                        valuationStatus:
                            valuation
                                .valuationStatus,
                    },
                    session,
                });

                return updated;
            },
        );

    await draft.populate({
        path: 'lines.productVariant',
        select:
            '_id name referenceUnit yieldPercent status',
    });

    return {
        draft:
            serializeTechnicalSheetDraft(draft),
        resolutionCandidates:
            valuation.resolutionCandidates,
    };
};

export {
    buildTechnicalSheetValuation,
    stableFingerprint,
    valuateTechnicalSheet,
};
