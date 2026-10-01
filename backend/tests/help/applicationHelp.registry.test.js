import { describe, expect, it } from 'vitest';

import {
    ACTIVE_HELP_REGISTRY,
    APPLICATION_HELP_MODULES,
} from '../../config/applicationHelp.registry.js';

describe('application Help registry', () => {
    it('compose le corpus Core avec les extensions métier livrées', () => {
        expect(APPLICATION_HELP_MODULES.map(({ key }) => key)).toEqual([
            'dossiers',
            'reference-management',
            'products',
            'suppliers',
            'technical-sheets',
        ]);

        expect(ACTIVE_HELP_REGISTRY.entriesById)
            .toHaveProperty('workspace.dossiers.open');
        expect(ACTIVE_HELP_REGISTRY.entriesById)
            .toHaveProperty('workspace.products.reference');
        expect(ACTIVE_HELP_REGISTRY.entriesById)
            .toHaveProperty('workspace.suppliers.pricing');
        expect(ACTIVE_HELP_REGISTRY.entriesById)
            .toHaveProperty('workspace.technical_sheets.validate');
        expect(ACTIVE_HELP_REGISTRY.entriesById)
            .toHaveProperty('platform.products.reference');
        expect(ACTIVE_HELP_REGISTRY.entriesById)
            .toHaveProperty('platform.suppliers.reference');
    });

    it('regroupe l’aide Platform Produits et Fournisseurs dans une catégorie métier unique', () => {
        expect(ACTIVE_HELP_REGISTRY.categoriesById)
            .toHaveProperty('platform_reference_management');
        expect(
            ACTIVE_HELP_REGISTRY.categoriesById.platform_reference_management,
        ).toMatchObject({
            context: 'platform',
            label: 'Gestion des référentiels',
        });

        expect(ACTIVE_HELP_REGISTRY.categoriesById)
            .not.toHaveProperty('platform_product_references');
        expect(ACTIVE_HELP_REGISTRY.categoriesById)
            .not.toHaveProperty('platform_supplier_references');

        expect(ACTIVE_HELP_REGISTRY.categoriesById.workspace_products)
            .toMatchObject({
                context: 'workspace',
                label: 'Produits',
            });
        expect(ACTIVE_HELP_REGISTRY.categoriesById.workspace_suppliers)
            .toMatchObject({
                context: 'workspace',
                label: 'Fournisseurs & prix',
            });

        for (const entryId of [
            'platform.products.reference',
            'platform.products.governance',
            'platform.suppliers.reference',
            'platform.suppliers.manage',
        ]) {
            expect(ACTIVE_HELP_REGISTRY.entriesById[entryId].categoryId)
                .toBe('platform_reference_management');
        }
    });

    it('conserve séparées les permissions Workspace et Application Global', () => {
        const workspaceEntry =
            ACTIVE_HELP_REGISTRY.entriesById['workspace.products.reference'];
        const platformEntry =
            ACTIVE_HELP_REGISTRY.entriesById['platform.products.reference'];

        expect(workspaceEntry.audience.permissions)
            .toContain('product:read');
        expect(workspaceEntry.audience.applicationGlobalPermissions)
            .toEqual([]);

        expect(platformEntry.audience.permissions).toEqual([]);
        expect(platformEntry.audience.applicationGlobalPermissions)
            .toContain('product:reference:read');
    });
});