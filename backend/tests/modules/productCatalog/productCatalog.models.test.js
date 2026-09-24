import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import { CanonicalProduct } from '../../../modules/productCatalog/canonicalProduct.model.js';
import { ProductCategory } from '../../../modules/productCatalog/productCategory.model.js';
import { ProductCharacteristic } from '../../../modules/productCatalog/productCharacteristic.model.js';
import { ProductImportSession } from '../../../modules/productCatalog/productImportSession.model.js';
import { ProductReferenceEvent } from '../../../modules/productCatalog/productReferenceEvent.model.js';
import { ReferenceContribution } from '../../../modules/productCatalog/referenceContribution.model.js';
import { ProductVariant } from '../../../modules/productCatalog/productVariant.model.js';
import { ProductVariety } from '../../../modules/productCatalog/productVariety.model.js';
import { WorkspaceProduct } from '../../../modules/productCatalog/workspaceProduct.model.js';

describe('M-002 product catalog models', () => {
    it('garde les références globales hors ownership Workspace', () => {
        expect(CanonicalProduct.schema.path('workspace')).toBeUndefined();
        expect(ProductVariant.schema.path('workspace')).toBeUndefined();
        expect(ProductCategory.schema.path('workspace')).toBeUndefined();
        expect(ProductVariety.schema.path('workspace')).toBeUndefined();
        expect(ProductCharacteristic.schema.path('workspace')).toBeUndefined();
        expect(
            CanonicalProduct.schema.path('contributedFromWorkspace'),
        ).toBeDefined();
    });

    it('structure Variétés et Caractéristiques sous le Produit parent', () => {
        expect(
            ProductVariety.schema.path('canonicalProduct').options.required,
        ).toBe(true);
        expect(
            ProductCharacteristic.schema.path('canonicalProduct').options.required,
        ).toBe(true);
        expect(
            ProductCharacteristic.schema.path('kind').options.enum,
        ).toEqual([
            'PRESENTATION',
            'COMMERCIAL_TYPE',
            'SIZE_FORMAT',
            'COLOR',
            'QUALITY_DESIGNATION',
        ]);
    });

    it('porte l ownership Workspace uniquement sur WorkspaceProduct', () => {
        expect(
            WorkspaceProduct.schema.path('workspace').options.required,
        ).toBe(true);
        expect(
            WorkspaceProduct.schema.path('workspace').options.immutable,
        ).toBe(true);
    });

    it('porte Variété et Caractéristiques structurées sans Présentation textuelle persistée', () => {
        expect(ProductVariant.schema.path('variety')).toBeDefined();
        expect(ProductVariant.schema.path('characteristics')).toBeDefined();
        expect(ProductVariant.schema.path('presentation')).toBeUndefined();
        expect(ProductVariant.schema.path('normalizedPresentation')).toBeUndefined();
        expect(ProductVariant.schema.path('form')).toBeUndefined();
        expect(ProductVariant.schema.path('preservation')).toBeUndefined();
    });

    it('crée par défaut les identités Produit en ACTIVE', () => {
        expect(CanonicalProduct.schema.path('status').options.default).toBe('ACTIVE');
        expect(ProductVariant.schema.path('status').options.default).toBe('ACTIVE');
    });

    it('déclare les contraintes uniques structurantes', () => {
        const productIndex = CanonicalProduct.schema.indexes().find(
            ([fields, options]) => (
                fields.searchKeys === 1
                && options.name === 'canonical_product_search_keys_unique'
            ),
        );
        const variantIndex = ProductVariant.schema.indexes().find(
            ([fields, options]) => (
                fields.canonicalProduct === 1
                && fields.normalizedSignature === 1
                && options.name === 'product_variant_identity_unique'
            ),
        );
        const workspaceIndex = WorkspaceProduct.schema.indexes().find(
            ([fields, options]) => (
                fields.workspace === 1
                && fields.productVariant === 1
                && options.name === 'workspace_product_unique'
            ),
        );

        expect(productIndex?.[1].unique).toBe(true);
        expect(variantIndex?.[1].unique).toBe(true);
        expect(workspaceIndex?.[1].unique).toBe(true);
    });

    it('sépare la revue des contributions du lifecycle des références', () => {
        expect(
            ReferenceContribution.schema.path('workspace').options.required,
        ).toBe(true);
        expect(
            ReferenceContribution.schema.path('classification').options.enum,
        ).toEqual([
            'EXISTING',
            'AUTO_PUBLISHABLE',
            'REVIEW_REQUIRED',
            'INVALID',
        ]);
        expect(
            ReferenceContribution.schema.path('status').options.enum,
        ).toEqual([
            'PENDING_REVIEW',
            'APPROVED',
            'REJECTED',
        ]);
        expect(
            CanonicalProduct.schema.path('status').options.enum,
        ).toEqual(['ACTIVE', 'ARCHIVED']);
    });

    it('rend les événements globaux immuables et les imports temporaires scopés', () => {
        for (const path of [
            'actor',
            'workspace',
            'action',
            'entityType',
            'entityId',
            'metadata',
        ]) {
            expect(
                ProductReferenceEvent.schema.path(path).options.immutable,
            ).toBe(true);
        }

        const ttlIndex = ProductImportSession.schema.indexes().find(
            ([fields, options]) => (
                fields.expiresAt === 1
                && options.name === 'product_import_session_ttl'
            ),
        );
        const scopeIndex = ProductImportSession.schema.indexes().find(
            ([fields, options]) => (
                fields.scope === 1
                && fields.workspace === 1
                && fields.actor === 1
                && options.name
                    === 'product_import_session_scope_workspace_actor_created_at'
            ),
        );

        expect(ttlIndex?.[1].expireAfterSeconds).toBe(0);
        expect(scopeIndex).toBeDefined();
    });

    it('refuse un rendement supérieur à 100', async () => {
        const actorId = new mongoose.Types.ObjectId();
        const variant = new ProductVariant({
            canonicalProduct: new mongoose.Types.ObjectId(),
            normalizedSignature: '_|_|_',
            referenceUnit: 'KG',
            yieldPercent: 101,
            createdBy: actorId,
            updatedBy: actorId,
        });

        await expect(variant.validate()).rejects.toThrow();
    });
});
