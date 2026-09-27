import {
    Supplier,
    SupplierArticle,
} from '../modules/supplierCatalog/supplier.model.js';
import {
    SupplierCatalogEdition,
    SupplierCatalogImportSession,
    SupplierCatalogLine,
    SupplierCommerceLock,
    SupplierTariff,
} from '../modules/supplierCatalog/supplierCatalog.model.js';
import {
    DossierSupplierReference,
    InvoicedPrice,
    NegotiatedPrice,
    WorkspaceSupplierPricingPolicy,
} from '../modules/supplierCatalog/supplierPricing.model.js';

const M003_INDEX_NAMES = Object.freeze([
    'supplier_scope_status_name',
    'supplier_workspace_status_name',
    'supplier_article_global_reference_unique',
    'supplier_article_workspace_reference_unique',
    'supplier_article_product_status',
    'supplier_catalog_global_edition_unique',
    'supplier_catalog_workspace_edition_unique',
    'supplier_catalog_scope_workspace_status',
    'supplier_catalog_line_current_identity_unique',
    'supplier_catalog_line_scope_workspace_match',
    'supplier_tariff_current_edition_article_unique',
    'supplier_tariff_article_validity',
    'negotiated_price_dossier_article_period',
    'invoiced_price_dossier_article_invoice_date',
    'invoiced_price_dossier_status_date',
    'dossier_supplier_reference_unique',
    'dossier_supplier_reference_status',
    'workspace_supplier_pricing_policy_unique',
    'supplier_catalog_import_session_ttl',
    'supplier_catalog_import_scope_workspace_actor_created_at',
    'supplier_commerce_lock_key_unique',
]);

const M003_MODELS = Object.freeze([
    Supplier,
    SupplierArticle,
    SupplierCatalogEdition,
    SupplierCatalogLine,
    SupplierTariff,
    NegotiatedPrice,
    InvoicedPrice,
    DossierSupplierReference,
    WorkspaceSupplierPricingPolicy,
    SupplierCatalogImportSession,
    SupplierCommerceLock,
]);

const ensureM003SupplierCatalogIndexes = async () => {
    for (const model of M003_MODELS) {
        await model.createIndexes();
    }

    const indexes = await Promise.all(
        M003_MODELS.map(async (model) => ({
            model: model.modelName,
            indexes: await model.collection.indexes(),
        })),
    );

    const ensured = indexes.flatMap(({ model, indexes: modelIndexes }) =>
        modelIndexes
            .map(({ name }) => name)
            .filter((name) => M003_INDEX_NAMES.includes(name))
            .map((name) => ({ model, name })));

    const ensuredNames = new Set(ensured.map(({ name }) => name));
    const missing = M003_INDEX_NAMES.filter(
        (name) => !ensuredNames.has(name),
    );

    if (missing.length > 0) {
        throw new Error(
            'Indexes M-003 manquants : ' + missing.join(', '),
        );
    }

    return {
        ensured,
        ensuredCount: ensured.length,
        totalExpected: M003_INDEX_NAMES.length,
    };
};

export {
    M003_INDEX_NAMES,
    ensureM003SupplierCatalogIndexes,
};
