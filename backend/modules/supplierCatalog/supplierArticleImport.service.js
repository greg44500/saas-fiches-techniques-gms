import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { parseProductImportFile } from '../productCatalog/productCatalogImport.parser.js';
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
    scope, workspaceId = null, actorId, importId, supplierId, mapping,
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

    const seen = new Set();
    const preview = [];
    for (const [index, raw] of importSession.rows.entries()) {
        const row = mapImportRow({
            row: raw, rowNumber: index + 2, mapping,
            defaults: { currency: 'EUR' },
        });
        const reference = normalizeSupplierReference(row.supplierReference);
        const errors = [...row.errors];
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
        createdArticleIds: [], updatedArticleIds: [],
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
