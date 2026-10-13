import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { ProductVariant } from '../productCatalog/productVariant.model.js';
import { SupplierArticle } from './supplier.model.js';
import { SupplierTariff } from './supplierCatalog.model.js';
import { normalizeSupplierPrice } from './supplierPriceMath.service.js';
import { supplierTariffPresentation } from './supplierArticlePresentation.service.js';
import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import { acquireCommerceLock } from './supplierCatalog.service.js';
import { createSupplierCatalogEvent } from './supplierCatalogEvent.service.js';

const findReadableArticle = async ({ articleId, workspaceId, session = null }) => {
    const article = await SupplierArticle.findOne({
        _id: articleId,
        $or: mongoose.trusted([
            { scope: SUPPLIER_SCOPE.GLOBAL_SHARED, workspace: null },
            { scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE, workspace: workspaceId },
        ]),
    }).session(session).populate('productVariant', 'referenceUnit name');
    if (!article) throw new AppError('Article introuvable dans cet espace de travail.', 404);
    return article;
};

const serializeTariffRevision = (tariff, article) => ({
    ...supplierTariffPresentation(tariff, article),
    revision: tariff.revision,
    isCurrent: tariff.isCurrent,
    correctionReason: tariff.correctionReason ?? null,
    replacesTariffId: tariff.replacesTariff?.toString() ?? null,
    correctedAt: tariff.createdAt,
});

const listArticlePriceHistory = async ({ articleId, workspaceId }) => {
    const article = await findReadableArticle({ articleId, workspaceId });
    const tariffs = await SupplierTariff.find({
        supplierArticle: article._id,
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspace: workspaceId,
        sourceKind: 'PRICE_LIST',
    }).sort({ createdAt: -1, _id: -1 });
    return {
        tariffs: tariffs.map((tariff) => serializeTariffRevision(tariff, article)),
    };
};

// Une correction de saisie remplace la valeur applicable sur toute sa période
// initiale ; l'enregistrement d'origine reste consultable en historique.
const correctArticlePrice = async ({
    articleId, tariffId, workspaceId, actorId, data,
}) => mongoose.connection.transaction(async (session) => {
    const article = await findReadableArticle({
        articleId, workspaceId, session,
    });
    if (article.status !== SUPPLIER_RESOURCE_STATUS.ACTIVE) {
        throw new AppError('Réactivez l’Article avant de corriger son tarif.', 409);
    }

    await acquireCommerceLock({
        key: 'supplier-price-list:' + article.id, session,
    });
    const prior = await SupplierTariff.findOne({
        _id: tariffId,
        supplierArticle: article._id,
        sourceKind: 'PRICE_LIST',
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspace: workspaceId,
        isCurrent: true,
    }).session(session);
    if (!prior) {
        throw new AppError('Tarif non modifiable ou déjà remplacé.', 409);
    }
    const same = prior.sourceAmount.toString() === data.sourceAmount
        && prior.sourceBasis === data.sourceBasis;
    if (same) {
        throw new AppError('Aucun changement de montant ou de base tarifaire.', 400);
    }

    const variant = article.productVariant;
    const normalized = variant ? normalizeSupplierPrice({
        sourceAmount: data.sourceAmount,
        sourceBasis: data.sourceBasis,
        packaging: prior.packagingSnapshot ?? article.packaging,
        targetUnit: variant.referenceUnit,
    }) : { normalizedAmount: null, normalizedUnit: null };

    // L'index partiel garantit une seule version courante par import/Article.
    prior.isCurrent = false;
    prior.updatedBy = actorId;
    await prior.save({ session });

    const [next] = await SupplierTariff.create([{
        catalogEdition: null,
        catalogLine: null,
        sourceKind: 'PRICE_LIST',
        sourceLabel: prior.sourceLabel,
        sourceImportId: prior.sourceImportId,
        packagingSnapshot: prior.packagingSnapshot,
        supplierArticle: article._id,
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspace: workspaceId,
        revision: prior.revision + 1,
        replacesTariff: prior._id,
        correctionReason: data.reason,
        isCurrent: true,
        sourceAmount: data.sourceAmount,
        sourceBasis: data.sourceBasis,
        currency: prior.currency,
        normalizedAmount: normalized.normalizedAmount,
        normalizedUnit: normalized.normalizedUnit,
        validFrom: prior.validFrom,
        validTo: prior.validTo,
        provenance: prior.provenance,
        createdBy: actorId,
        updatedBy: actorId,
    }], { session });

    await createSupplierCatalogEvent({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId,
        actorId,
        action: SUPPLIER_CATALOG_EVENT_ACTION.SUPPLIER_TARIFF_CORRECTED,
        entityType: SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER_TARIFF,
        entityId: next._id,
        metadata: {
            articleId: article._id.toString(),
            previousTariffId: prior._id.toString(),
            reason: data.reason,
        },
        session,
    });

    return {
        tariff: serializeTariffRevision(next, article),
    };
});

export { correctArticlePrice, listArticlePriceHistory };
