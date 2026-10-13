import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { parseProductImportFile } from '../productCatalog/productCatalogImport.parser.js';
import { ProductVariant } from '../productCatalog/productVariant.model.js';
import { SupplierTariff } from './supplierCatalog.model.js';
import { supplierSourcePriceLabel } from './supplierArticlePresentation.service.js';
import { normalizeSupplierPrice } from './supplierPriceMath.service.js';
import { SupplierArticle } from './supplier.model.js';
import { SupplierArticleImportSession } from './supplierArticleImport.model.js';
import {
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_CATALOG_IMPORT_STATUS,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import { normalizeSupplierReference } from './supplierCatalog.normalization.js';
import { serializePackaging } from './supplierCatalog.serializer.js';
import { createSupplierCatalogEvent } from './supplierCatalogEvent.service.js';
import { mapImportRow } from './supplierCatalogImport.service.js';
import {
    acquireCommerceLock,
    assertSupplierForCatalog,
} from './supplierCatalog.service.js';
import {
    createArticleInSession,
    normalizePackaging,
} from './supplierReference.service.js';

const sessionOwnership = ({ scope, workspaceId, actorId }) => ({
    scope,
    workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED ? null : workspaceId,
    actor: actorId,
});

const articleVisibility = ({ scope, workspaceId }) => (
    scope === SUPPLIER_SCOPE.GLOBAL_SHARED
        ? { scope, workspace: null }
        : { $or: mongoose.trusted([
            { scope: SUPPLIER_SCOPE.GLOBAL_SHARED, workspace: null },
            { scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE, workspace: workspaceId },
        ]) }
);

const hasPackaging = (value) => (
    value !== null && value !== undefined
    && Object.values(value).some((item) => (
        item !== null && item !== undefined && item !== ''
    ))
);

const articleChanges = (article, row) => {
    const changes = {};
    if (row.designation && row.designation !== article.supplierDesignation) {
        changes.supplierDesignation = row.designation;
    }
    if (row.brand && row.brand !== article.brand) {
        changes.brand = row.brand;
    }
    if (hasPackaging(row.packaging)) {
        const packaging = normalizePackaging(row.packaging);
        if (
            JSON.stringify(serializePackaging(packaging))
            !== JSON.stringify(serializePackaging(article.packaging))
        ) {
            changes.packaging = packaging;
        }
    }
    return changes;
};

const findExisting = async ({
    scope, workspaceId, supplierId, reference, session = null,
}) => {
    const articles = await SupplierArticle.find({
        supplier: supplierId,
        normalizedSupplierReference: reference,
        ...articleVisibility({ scope, workspaceId }),
    }).session(session);
    // Un Workspace ne modifie jamais un Article global.
    return articles.find((item) => item.scope === scope)
        ?? articles.find((item) => item.scope === SUPPLIER_SCOPE.GLOBAL_SHARED)
        ?? null;
};

const resolvePriceListValidity = (priceList, importDate = new Date()) => {
    if (!priceList || priceList.validityMode !== 'FROM_IMPORT') {
        return priceList;
    }
    const dateLabel = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(importDate);
    return {
        ...priceList,
        name: priceList.name || 'Prix importés le ' + dateLabel,
        validFrom: importDate.toISOString(),
        validTo: null,
    };
};

const overlaps = (firstFrom, firstTo, secondFrom, secondTo) => (
    (!firstTo || !secondFrom || new Date(firstTo) >= new Date(secondFrom))
    && (!secondTo || !firstFrom || new Date(secondTo) >= new Date(firstFrom))
);

// Toujours vérifier les deux sources : catalogue et mercuriale autonome.
const assertNoTariffOverlap = async ({ articleId, priceList, scope, workspaceId, session = null }) => {
    const tariffs = await SupplierTariff.find({
        supplierArticle: articleId, isCurrent: true,
        ...articleVisibility({ scope, workspaceId }),
    }).populate({ path: 'catalogEdition', select: '_id status' }).session(session).lean();
    const conflicting = tariffs.find((tariff) =>
        ((tariff.sourceKind || 'CATALOG') === 'PRICE_LIST'
            || tariff.catalogEdition?.status === SUPPLIER_RESOURCE_STATUS.ACTIVE)
        && overlaps(tariff.validFrom, tariff.validTo,
            priceList.validFrom, priceList.validTo));
    if (conflicting) {
        throw new AppError(
            'Une période tarifaire existe déjà pour cet Article. '
            + 'Aucun ancien prix n’est remplacé automatiquement.',
            409,
        );
    }
};

const storeListTariff = async ({
    article, priceList, sourcePrice, scope, workspaceId,
    actorId, sourceImportId, session,
}) => {
    if (!sourcePrice) return null;
    await acquireCommerceLock({
        key: 'supplier-price-list:' + article.id,
        session,
    });
    await assertNoTariffOverlap({
        articleId: article.id, priceList, scope, workspaceId, session,
    });
    const variantId = article.productVariant?._id ?? article.productVariant;
    const variant = variantId
        ? await ProductVariant.findById(variantId).select('referenceUnit').session(session).lean()
        : null;
    const normalized = variant
        ? normalizeSupplierPrice({
            sourceAmount: sourcePrice.amount,
            sourceBasis: sourcePrice.basis,
            packaging: article.packaging,
            targetUnit: variant.referenceUnit,
        })
        : { normalizedAmount: null, normalizedUnit: null };
    const [tariff] = await SupplierTariff.create([{
        catalogEdition: null,
        catalogLine: null,
        sourceKind: 'PRICE_LIST',
        sourceLabel: priceList.name,
        sourceImportId,
        packagingSnapshot: article.packaging ?? null,
        supplierArticle: article.id,
        scope,
        workspace: scope === SUPPLIER_SCOPE.GLOBAL_SHARED ? null : workspaceId,
        sourceAmount: sourcePrice.amount,
        sourceBasis: sourcePrice.basis,
        currency: sourcePrice.currency,
        normalizedAmount: normalized.normalizedAmount,
        normalizedUnit: normalized.normalizedUnit,
        validFrom: new Date(priceList.validFrom),
        validTo: priceList.validTo ? new Date(priceList.validTo) : null,
        provenance: priceList.source || priceList.name,
        createdBy: actorId,
        updatedBy: actorId,
    }], { session });
    return tariff.id;
};

const inspectSupplierArticleImport = async ({
    scope, workspaceId = null, actorId, file,
}) => {
    const buffer = Buffer.isBuffer(file?.buffer)
        ? file.buffer
        : file?.filePath ? await readFile(file.filePath) : null;
    if (!buffer) throw new AppError('Fichier d’import absent.', 400);

    const parsed = parseProductImportFile({
        originalname: file.originalName ?? file.originalname ?? '',
        buffer,
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const importSession = await SupplierArticleImportSession.create({
        ...sessionOwnership({ scope, workspaceId, actorId }),
        format: parsed.format,
        headers: parsed.headers,
        rows: parsed.rows,
        expiresAt,
    });
    return {
        importId: importSession.id,
        format: parsed.format,
        headers: parsed.headers,
        rowCount: parsed.rows.length,
        expiresAt,
    };
};

const loadSession = async ({
    scope, workspaceId, actorId, importId, statuses, session = null,
}) => {
    const result = await SupplierArticleImportSession.findOne({
        _id: importId,
        ...sessionOwnership({ scope, workspaceId, actorId }),
        status: mongoose.trusted({ $in: statuses }),
        expiresAt: mongoose.trusted({ $gt: new Date() }),
    }).session(session);
    if (!result) {
        throw new AppError('Import introuvable, expiré ou déjà confirmé.', 404);
    }
    return result;
};

const previewSupplierArticleImport = async ({
    scope, workspaceId = null, actorId, importId, supplierId, mapping, priceList = null,
}) => {
    await assertSupplierForCatalog({
        scope, workspaceId, supplierId, session: null,
    });
    const importSession = await loadSession({
        scope, workspaceId, actorId, importId,
        statuses: [
            SUPPLIER_CATALOG_IMPORT_STATUS.INSPECTED,
            SUPPLIER_CATALOG_IMPORT_STATUS.PREVIEWED,
        ],
    });

    // Ce calcul sert uniquement à la prévisualisation des chevauchements.
    // La date réellement applicable est fixée au moment de la confirmation.
    const previewPriceList = resolvePriceListValidity(priceList);
    const seen = new Set();
    const preview = [];
    for (const [index, raw] of importSession.rows.entries()) {
        const row = mapImportRow({
            row: raw, rowNumber: index + 2, mapping,
            defaults: { currency: 'EUR', priceBasis: priceList?.defaultPriceBasis },
        });
        const reference = normalizeSupplierReference(row.supplierReference);
        const errors = [...row.errors];
        if (row.sourcePrice && !priceList) {
            errors.push('Précisez la provenance et la validité de la liste tarifaire.');
        }
        if ((row.supplierReference?.length ?? 0) > 120) {
            errors.push('Référence fournisseur trop longue (120 caractères maximum).');
        }
        if ((row.designation?.length ?? 0) > 300) {
            errors.push('Désignation trop longue (300 caractères maximum).');
        }
        if ((row.brand?.length ?? 0) > 160) {
            errors.push('Marque trop longue (160 caractères maximum).');
        }
        let classification = 'CREATE';
        let articleId = null;
        let observedUpdatedAt = null;

        if (!reference) {
            classification = 'SKIPPED';
            errors.push('Référence fournisseur absente : ligne non importée.');
        } else if (seen.has(reference)) {
            classification = 'INVALID';
            errors.push('Référence fournisseur dupliquée dans le fichier.');
        } else if (errors.length) {
            classification = 'INVALID';
        } else {
            const existing = await findExisting({
                scope, workspaceId, supplierId, reference,
            });
            if (existing) {
                articleId = existing.id;
                observedUpdatedAt = existing.updatedAt?.toISOString() ?? null;
                if (existing.status !== SUPPLIER_RESOURCE_STATUS.ACTIVE) {
                    classification = 'INVALID';
                    errors.push('Article archivé : réactivez-le avant le réimport.');
                } else if (existing.scope !== scope) {
                    classification = 'SHARED';
                } else {
                    classification = Object.keys(articleChanges(existing, row)).length
                        ? 'UPDATE' : 'UNCHANGED';
                }
                if (row.sourcePrice && priceList
                    && classification !== 'INVALID') {
                    try {
                        await assertNoTariffOverlap({
                            articleId: existing._id,
                            priceList: previewPriceList,
                            scope, workspaceId,
                        });
                    } catch (error) {
                        classification = 'INVALID';
                        errors.push(error.message);
                    }
                }
            }
        }
        if (reference) seen.add(reference);
        preview.push({
            rowNumber: row.rowNumber,
            supplierReference: row.supplierReference,
            normalizedSupplierReference: reference,
            designation: row.designation,
            brand: row.brand,
            packaging: hasPackaging(row.packaging) ? row.packaging : null,
            sourcePrice: row.sourcePrice,
            sourcePriceLabel: supplierSourcePriceLabel(row.sourcePrice, row.packaging),
            classification,
            articleId,
            observedUpdatedAt,
            errors,
        });
    }
    const counts = preview.reduce((acc, row) => {
        acc[row.classification] = (acc[row.classification] ?? 0) + 1;
        return acc;
    }, {});

    importSession.supplier = supplierId;
    importSession.mapping = mapping;
    importSession.priceListDraft = priceList;
    importSession.preview = preview;
    importSession.status = SUPPLIER_CATALOG_IMPORT_STATUS.PREVIEWED;
    await importSession.save();

    return { importId, rows: preview, counts, expiresAt: importSession.expiresAt };
};

const commitSupplierArticleImport = async ({
    scope, workspaceId = null, actorId, importId,
}) => mongoose.connection.transaction(async (session) => {
    const importSession = await loadSession({
        scope, workspaceId, actorId, importId,
        statuses: [SUPPLIER_CATALOG_IMPORT_STATUS.PREVIEWED],
        session,
    });
    if (importSession.preview.some((row) => row.classification === 'INVALID')) {
        throw new AppError('Corrigez les lignes invalides avant confirmation.', 409);
    }
    await assertSupplierForCatalog({
        scope, workspaceId, supplierId: importSession.supplier, session,
    });

    importSession.status = SUPPLIER_CATALOG_IMPORT_STATUS.COMMITTING;
    await importSession.save({ session });
    const result = {
        created: 0, updated: 0, unchanged: 0, shared: 0, skipped: 0,
        createdArticleIds: [], updatedArticleIds: [], priced: 0,
    };

    const confirmedPriceList = resolvePriceListValidity(
        importSession.priceListDraft,
    );
    const writeTariff = async (article, row) => {
        if (!row.sourcePrice) return;
        if (!confirmedPriceList) {
            throw new AppError('Provenance tarifaire absente.', 409);
        }
        await storeListTariff({
            article,
            priceList: confirmedPriceList,
            sourcePrice: row.sourcePrice,
            scope, workspaceId, actorId,
            sourceImportId: importSession._id, session,
        });
        result.priced += 1;
    };
    for (const row of importSession.preview) {
        if (row.classification === 'SKIPPED') {
            result.skipped += 1;
            continue;
        }
        const reference = row.normalizedSupplierReference;
        await acquireCommerceLock({
            key: [
                'supplier-article', scope,
                workspaceId?.toString() ?? 'global',
                importSession.supplier.toString(), reference,
            ].join(':'),
            session,
        });
        const existing = await findExisting({
            scope, workspaceId, supplierId: importSession.supplier,
            reference, session,
        });

        if (row.classification === 'CREATE') {
            if (existing) {
                throw new AppError('Article créé depuis la prévisualisation : recommencez.', 409);
            }
            const article = await createArticleInSession({
                scope, workspaceId, actorId, session,
                data: {
                    supplierId: importSession.supplier,
                    productVariantId: null,
                    supplierReference: row.supplierReference,
                    supplierDesignation: row.designation,
                    brand: row.brand,
                    packaging: row.packaging,
                    provenance: 'Import liste Articles fournisseur',
                },
            });
            result.created += 1;
            result.createdArticleIds.push(article.id);
            await writeTariff(article, row);
            continue;
        }

        if (
            !existing || existing.id !== row.articleId
            || existing.status !== SUPPLIER_RESOURCE_STATUS.ACTIVE
            || (existing.updatedAt?.toISOString() ?? null) !== row.observedUpdatedAt
        ) {
            throw new AppError('Article modifié depuis la prévisualisation : recommencez.', 409);
        }
        if (row.classification === 'SHARED') {
            if (existing.scope !== SUPPLIER_SCOPE.GLOBAL_SHARED) {
                throw new AppError('L’Article partagé a changé.', 409);
            }
            result.shared += 1;
            await writeTariff(existing, row);
            continue;
        }
        if (existing.scope !== scope) {
            throw new AppError('Article global non modifiable depuis un Workspace.', 409);
        }
        const changes = articleChanges(existing, row);
        if (row.classification === 'UNCHANGED' && Object.keys(changes).length) {
            throw new AppError('Article modifié depuis la prévisualisation.', 409);
        }
        if (row.classification === 'UPDATE' && Object.keys(changes).length) {
            existing.set(changes);
            existing.updatedBy = actorId;
            await existing.save({ session });
            await createSupplierCatalogEvent({
                scope, workspaceId: existing.workspace, actorId,
                action: SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_UPDATED,
                entityType: SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER_ARTICLE,
                entityId: existing._id,
                metadata: { changedFields: Object.keys(changes), importId },
                session,
            });
            result.updated += 1;
            result.updatedArticleIds.push(existing.id);
        } else {
            result.unchanged += 1;
        }
        await writeTariff(existing, row);
    }
    importSession.status = SUPPLIER_CATALOG_IMPORT_STATUS.COMMITTED;
    importSession.committedResult = result;
    await importSession.save({ session });
    await createSupplierCatalogEvent({
        scope,
        workspaceId: scope === SUPPLIER_SCOPE.GLOBAL_SHARED ? null : workspaceId,
        actorId,
        action: SUPPLIER_CATALOG_EVENT_ACTION.ARTICLE_IMPORT_COMMITTED,
        entityType: SUPPLIER_CATALOG_EVENT_ENTITY_TYPE.SUPPLIER,
        entityId: importSession.supplier,
        metadata: { importId, ...result },
        session,
    });
    return result;
});

export {
    commitSupplierArticleImport,
    inspectSupplierArticleImport,
    previewSupplierArticleImport,
};
