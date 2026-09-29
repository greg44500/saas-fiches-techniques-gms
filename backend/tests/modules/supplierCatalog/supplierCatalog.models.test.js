import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    Supplier,
    SupplierArticle,
} from '../../../modules/supplierCatalog/supplier.model.js';
import {
    SupplierCatalogEdition,
    SupplierCatalogImportSession,
    SupplierCatalogLine,
    SupplierTariff,
} from '../../../modules/supplierCatalog/supplierCatalog.model.js';
import {
    DossierSupplierReference,
    InvoicedPrice,
    NegotiatedPrice,
    WorkspaceSupplierPricingPolicy,
} from '../../../modules/supplierCatalog/supplierPricing.model.js';

describe('M-003 supplier catalog models', () => {
    it('impose l ownership des ressources privées et interdit un Workspace au global', async () => {
        const actorId = new mongoose.Types.ObjectId();

        await expect(new Supplier({
            scope: 'WORKSPACE_PRIVATE',
            name: 'Privé',
            normalizedName: 'prive',
            createdBy: actorId,
            updatedBy: actorId,
        }).validate()).rejects.toThrow(/Workspace/);

        await expect(new Supplier({
            scope: 'GLOBAL_SHARED',
            workspace: new mongoose.Types.ObjectId(),
            name: 'Global',
            normalizedName: 'global',
            createdBy: actorId,
            updatedBy: actorId,
        }).validate()).rejects.toThrow(/globale/);
    });

    it('référence les catégories Produit sans créer de taxonomie Fournisseur parallèle', () => {
        const categoryPath = Supplier.schema.path('productCategories');

        expect(categoryPath.instance).toBe('Array');
        expect(categoryPath.caster.options.ref).toBe('ProductCategory');
    });

    it('utilise Decimal128 pour les prix source et normalisés', () => {
        expect(SupplierTariff.schema.path('sourceAmount').instance)
            .toBe('Decimal128');
        expect(NegotiatedPrice.schema.path('sourceAmount').instance)
            .toBe('Decimal128');
        expect(InvoicedPrice.schema.path('sourceAmount').instance)
            .toBe('Decimal128');
        expect(InvoicedPrice.schema.path('normalizedAmount').instance)
            .toBe('Decimal128');
    });

    it('porte workspace et dossier sur toutes les données commerciales locales', () => {
        for (const model of [
            NegotiatedPrice,
            InvoicedPrice,
            DossierSupplierReference,
        ]) {
            expect(model.schema.path('workspace').options.required).toBe(true);
            expect(model.schema.path('dossier').options.required).toBe(true);
            expect(model.schema.path('workspace').options.immutable).toBe(true);
            expect(model.schema.path('dossier').options.immutable).toBe(true);
        }
    });

    it('versionne les lignes et tarifs courants', () => {
        expect(SupplierCatalogLine.schema.path('revision').options.default)
            .toBe(1);
        expect(SupplierTariff.schema.path('revision').options.default)
            .toBe(1);

        const lineIndex = SupplierCatalogLine.schema.indexes().find(
            ([, options]) =>
                options.name
                    === 'supplier_catalog_line_current_identity_unique',
        );
        const tariffIndex = SupplierTariff.schema.indexes().find(
            ([, options]) =>
                options.name
                    === 'supplier_tariff_current_edition_article_unique',
        );

        expect(lineIndex?.[1].unique).toBe(true);
        expect(tariffIndex?.[1].unique).toBe(true);
    });

    it('rend les identités Article et édition uniques par portée', () => {
        const articleIndexes = SupplierArticle.schema.indexes();
        const editionIndexes = SupplierCatalogEdition.schema.indexes();

        expect(
            articleIndexes.find(([, options]) =>
                options.name
                    === 'supplier_article_global_reference_unique')?.[1].unique,
        ).toBe(true);
        expect(
            articleIndexes.find(([, options]) =>
                options.name
                    === 'supplier_article_workspace_reference_unique')?.[1].unique,
        ).toBe(true);
        expect(
            editionIndexes.find(([, options]) =>
                options.name
                    === 'supplier_catalog_global_edition_unique')?.[1].unique,
        ).toBe(true);
    });

    it('garde l import temporaire et la politique au niveau Workspace', () => {
        const ttlIndex = SupplierCatalogImportSession.schema.indexes().find(
            ([fields, options]) =>
                fields.expiresAt === 1
                && options.name === 'supplier_catalog_import_session_ttl',
        );
        const policyIndex =
            WorkspaceSupplierPricingPolicy.schema.indexes().find(
                ([fields, options]) =>
                    fields.workspace === 1
                    && options.name
                        === 'workspace_supplier_pricing_policy_unique',
            );

        expect(ttlIndex?.[1].expireAfterSeconds).toBe(0);
        expect(policyIndex?.[1].unique).toBe(true);
    });
});
