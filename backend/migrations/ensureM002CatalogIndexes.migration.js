import {
    CanonicalProduct,
} from '../modules/productCatalog/canonicalProduct.model.js';
import {
    PRODUCT_GOVERNANCE_STATUS,
} from '../modules/productCatalog/productCatalog.registry.js';
import {
    ProductCategory,
} from '../modules/productCatalog/productCategory.model.js';
import {
    ProductCharacteristic,
} from '../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductImportSession,
} from '../modules/productCatalog/productImportSession.model.js';
import {
    ProductReferenceBootstrapRun,
} from '../modules/productCatalog/productReferenceBootstrapRun.model.js';
import {
    ProductReferenceEvent,
} from '../modules/productCatalog/productReferenceEvent.model.js';
import {
    ProductVariant,
} from '../modules/productCatalog/productVariant.model.js';
import {
    ProductVariety,
} from '../modules/productCatalog/productVariety.model.js';
import {
    WorkspaceProduct,
} from '../modules/productCatalog/workspaceProduct.model.js';
import {
    ReferenceContribution,
} from '../modules/productCatalog/referenceContribution.model.js';

const M002_INDEX_NAMES = Object.freeze([
    'product_category_normalized_unique',
    'product_category_status_name',
    'canonical_product_approved_search_keys_unique',
    'canonical_product_provisional_workspace_search_keys_unique',
    'canonical_product_search_grams_status',
    'canonical_product_status_category_updated_at',
    'canonical_product_workspace_status_created_at',
    'canonical_product_governance_workspace_updated_at',
    'product_variety_approved_product_name_unique',
    'product_variety_provisional_workspace_name_unique',
    'product_variety_product_status_name',
    'product_variety_search_grams_status',
    'product_variety_governance_workspace_product',
    'product_characteristic_approved_product_kind_name_unique',
    'product_characteristic_provisional_workspace_kind_name_unique',
    'product_characteristic_product_kind_status_name',
    'product_characteristic_search_grams_status',
    'product_characteristic_governance_workspace_product_kind',
    'reference_contribution_status_created_at',
    'reference_contribution_workspace_status_created_at',
    'reference_contribution_product_type_status_created_at',
    'product_variant_approved_normalized_name_unique',
    'product_variant_provisional_workspace_name_unique',
    'product_variant_approved_identity_unique',
    'product_variant_provisional_workspace_identity_unique',
    'product_variant_product_status_updated_at',
    'product_variant_workspace_status_created_at',
    'product_variant_governance_workspace_updated_at',
    'workspace_product_unique',
    'workspace_product_status_updated_at',
    'product_reference_event_entity_created_at',
    'product_reference_event_action_created_at',
    'product_reference_bootstrap_version_unique',
    'product_import_session_ttl',
    'product_import_session_scope_workspace_actor_created_at',
]);

const M002_MODELS = Object.freeze([
    ProductCategory,
    CanonicalProduct,
    ProductVariety,
    ProductCharacteristic,
    ReferenceContribution,
    ProductVariant,
    WorkspaceProduct,
    ProductReferenceEvent,
    ProductReferenceBootstrapRun,
    ProductImportSession,
]);

const GOVERNED_MODELS = Object.freeze([
    CanonicalProduct,
    ProductVariety,
    ProductCharacteristic,
    ProductVariant,
]);

const LEGACY_GOVERNANCE_INDEXES = new Map([
    [CanonicalProduct, [
        'canonical_product_search_keys_unique',
    ]],
    [ProductVariety, [
        'product_variety_product_name_unique',
    ]],
    [ProductCharacteristic, [
        'product_characteristic_product_kind_name_unique',
    ]],
    [ProductVariant, [
        'product_variant_normalized_name_unique',
        'product_variant_identity_unique',
    ]],
]);

const backfillGovernanceStatus = async () => {
    const results = [];
    for (const model of GOVERNED_MODELS) {
        const result = await model.updateMany(
            { governanceStatus: { $exists: false } },
            {
                $set: {
                    governanceStatus:
                        PRODUCT_GOVERNANCE_STATUS.APPROVED,
                },
            },
        );
        results.push({
            model: model.modelName,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        });
    }
    return results;
};

const dropLegacyGovernanceIndexes = async () => {
    const dropped = [];

    for (const [model, legacyNames] of LEGACY_GOVERNANCE_INDEXES) {
        const existing = new Set(
            (await model.collection.indexes()).map(({ name }) => name),
        );

        for (const name of legacyNames) {
            if (!existing.has(name)) continue;
            await model.collection.dropIndex(name);
            dropped.push({ model: model.modelName, name });
        }
    }

    return dropped;
};

const ensureM002CatalogIndexes = async () => {
    const governanceBackfill = await backfillGovernanceStatus();
    const droppedLegacyIndexes = await dropLegacyGovernanceIndexes();

    for (const model of M002_MODELS) {
        await model.createIndexes();
    }

    const indexes = (
        await Promise.all(
            M002_MODELS.map(async (model) => ({
                model: model.modelName,
                indexes: await model.collection.indexes(),
            })),
        )
    );

    const ensured = indexes.flatMap(({ model, indexes: modelIndexes }) =>
        modelIndexes
            .map(({ name }) => name)
            .filter((name) => M002_INDEX_NAMES.includes(name))
            .map((name) => ({ model, name })));

    const ensuredNames = new Set(ensured.map(({ name }) => name));
    const missing = M002_INDEX_NAMES.filter((name) => !ensuredNames.has(name));

    if (missing.length > 0) {
        throw new Error(
            `Indexes M-002 manquants : ${missing.join(', ')}`,
        );
    }

    return {
        governanceBackfill,
        droppedLegacyIndexes,
        ensured,
        ensuredCount: ensured.length,
        totalExpected: M002_INDEX_NAMES.length,
    };
};

export {
    M002_INDEX_NAMES,
    ensureM002CatalogIndexes,
};
