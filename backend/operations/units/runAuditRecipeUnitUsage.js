/**
 * Audit en lecture seule avant une correction d'unité de Référence Produit.
 * Usage : npm run audit:recipe-unit-usage -- "Croissant individuel PAI"
 */
import mongoose from 'mongoose';

import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import { normalizeProductText } from '../../modules/productCatalog/productCatalog.normalization.js';
import { ProductVariant } from '../../modules/productCatalog/productVariant.model.js';
import { SupplierArticle } from '../../modules/supplierCatalog/supplier.model.js';
import { SupplierTariff } from '../../modules/supplierCatalog/supplierCatalog.model.js';
import {
    packagingSignature, verifiedRecipeUnitCount,
} from '../../modules/supplierCatalog/supplierRecipeUnitEquivalence.service.js';
import { resolveApplicablePrice } from '../../modules/supplierCatalog/supplierPricing.service.js';
import {
    IndicativePrice,
    InvoicedPrice,
    NegotiatedPrice,
} from '../../modules/supplierCatalog/supplierPricing.model.js';
import { TechnicalSheetDraft } from '../../modules/technicalSheet/technicalSheetDraft.model.js';
import { TechnicalSheetValidation } from '../../modules/technicalSheet/technicalSheetValidation.model.js';

const requestedName = process.argv.slice(2).join(' ').trim();
if (!requestedName) {
    console.error('Indiquez le nom exact de la Référence Produit à auditer.');
    process.exitCode = 1;
} else {
    try {
        await connectDB(env.MONGODB_URI);
        const variants = await ProductVariant.find({
            normalizedName: normalizeProductText(requestedName),
        }).select('_id name referenceUnit identityActive governanceStatus').lean();

        const output = [];
        for (const variant of variants) {
            const articles = await SupplierArticle.find({
                productVariant: variant._id,
            }).select('_id scope workspace supplierReference packaging recipeUnitEquivalence productVariant').lean();
            const articleIds = articles.map((article) => article._id);
            const counts = await Promise.all([
                SupplierTariff.countDocuments({
                    supplierArticle: mongoose.trusted({ $in: articleIds }),
                }),
                NegotiatedPrice.countDocuments({
                    supplierArticle: mongoose.trusted({ $in: articleIds }),
                }),
                InvoicedPrice.countDocuments({
                    supplierArticle: mongoose.trusted({ $in: articleIds }),
                }),
                IndicativePrice.countDocuments({ productVariant: variant._id }),
                TechnicalSheetDraft.countDocuments({
                    'lines.productVariant': variant._id,
                }),
                TechnicalSheetValidation.countDocuments({
                    'linesSnapshot.productVariantId': variant._id,
                }),
            ]);
            // Lecture ciblée : preuve, snapshot tarifaire et état économique
            // de la ligne M-004, sans écriture ni réévaluation du brouillon.
            const tariffs = await SupplierTariff.find({
                supplierArticle: mongoose.trusted({ $in: articleIds }),
                isCurrent: true,
            }).select('supplierArticle sourceKind sourceAmount sourceBasis packagingSnapshot validFrom validTo').lean();
            const drafts = await TechnicalSheetDraft.find({
                'lines.productVariant': variant._id,
            }).select('workspace dossier lines valuationStatus valuedAt').limit(30).lean();
            const draftDiagnostics = await Promise.all(drafts.flatMap((draft) =>
                (draft.lines ?? []).filter((line) =>
                    line.productVariant?.toString() === variant._id.toString(),
                ).map(async (line) => {
                    let currentPrice = null;
                    let resolverError = null;
                    try {
                        const resolved = await resolveApplicablePrice({
                            workspaceId: draft.workspace,
                            dossierId: draft.dossier,
                            articleId: line.selectedSupplierArticle?.toString() ?? null,
                            productVariantId: variant._id.toString(),
                        });
                        currentPrice = {
                            source: resolved.resolvedSource,
                            normalizedAmount: resolved.price?.normalizedAmount ?? null,
                            normalizedUnit: resolved.price?.normalizedUnit ?? null,
                            alerts: resolved.alerts,
                        };
                    } catch (error) {
                        resolverError = error.message;
                    }
                    return {
                        dossierId: draft.dossier?.toString() ?? null,
                        articleSelectedId: line.selectedSupplierArticle?.toString() ?? null,
                        storedLineStatus: line.valuation?.status ?? null,
                        storedAmount: line.valuation?.normalizedAmount?.toString() ?? null,
                        valuationStatus: draft.valuationStatus,
                        valuedAt: draft.valuedAt,
                        currentPrice,
                        resolverError,
                    };
                }),
            ));
            output.push({
                draftPricing: draftDiagnostics,
                reference: {
                    id: variant._id.toString(),
                    name: variant.name,
                    unit: variant.referenceUnit,
                    identityActive: variant.identityActive,
                    governanceStatus: variant.governanceStatus,
                },
                articles: articles.map((article) => ({
                    id: article._id.toString(),
                    scope: article.scope,
                    workspaceId: article.workspace?.toString() ?? null,
                    supplierReference: article.supplierReference,
                    unitCount: article.packaging?.unitCount ?? null,
                    quantityPerUnit: article.packaging?.quantityPerUnit?.toString() ?? null,
                    unit: article.packaging?.unit ?? null,
                    confirmedRecipePieces: verifiedRecipeUnitCount({
                        packaging: article.packaging,
                        equivalence: article.recipeUnitEquivalence,
                        productVariantId: variant._id,
                    }),
                    evidenceRecorded: Boolean(article.recipeUnitEquivalence),
                    storedSignature: article.recipeUnitEquivalence?.packagingSignature ?? null,
                    currentSignature: packagingSignature(article.packaging),
                    tariffs: tariffs.filter((tariff) =>
                        tariff.supplierArticle.toString() === article._id.toString(),
                    ).map((tariff) => ({
                        id: tariff._id.toString(),
                        basis: tariff.sourceBasis,
                        amount: tariff.sourceAmount?.toString() ?? null,
                        validFrom: tariff.validFrom,
                        validTo: tariff.validTo,
                        hasSnapshot: Boolean(tariff.packagingSnapshot),
                        snapshotSignature: packagingSignature(tariff.packagingSnapshot),
                        matchesCurrentEvidence: Boolean(article.recipeUnitEquivalence
                            && packagingSignature(tariff.packagingSnapshot)
                                === article.recipeUnitEquivalence.packagingSignature),
                    })),
                })),
                usage: {
                    supplierTariffs: counts[0],
                    negotiatedPrices: counts[1],
                    invoicedPrices: counts[2],
                    indicativePrices: counts[3],
                    drafts: counts[4],
                    validatedSnapshots: counts[5],
                },
            });
        }
        console.log(JSON.stringify({
            database: mongoose.connection.name,
            readOnly: true,
            referenceName: requestedName,
            results: output,
        }, null, 2));
    } catch (error) {
        console.error('Audit des unités impossible :', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
}
