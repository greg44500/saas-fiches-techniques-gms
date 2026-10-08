import { describe, expect, it, vi } from 'vitest';
import { createHelpService } from '../../modules/help/help.service.js';

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

    it('oriente la gouvernance Produit vers la file À contrôler', () => {
        const entry =
            ACTIVE_HELP_REGISTRY.entriesById[
                'platform.products.governance'
            ];

        expect(entry.title)
            .toBe('Traiter les éléments Produit à contrôler');
        expect(entry.steps).toContain('Sélectionnez À contrôler.');
        expect(entry.steps).not.toContain(
            'Consultez Historique pour retrouver les Contributions déjà traitées.',
        );
        expect(entry.steps).toContain(
            'Examinez la donnée dans le drawer ciblé avant toute décision.',
        );
    });

    it('couvre les nouveaux parcours avec leurs permissions et capacités réelles', () => {
        const cases = [
            ['workspace.dossiers.create', 'dossier:create', null, false],
            ['workspace.dossiers.settings', 'dossier:update', null, false],
            ['workspace.suppliers.import', 'supplier:catalog:import', 'supplier_catalog_import', false],
            ['workspace.suppliers.indicative', 'supplier:indicative-price:read', null, false],
            ['workspace.technical_sheets.read', 'technical-sheet:read', null, false],
            ['workspace.technical_sheets.export', 'technical-sheet:export', 'technical_sheet_export', false],
            ['workspace.technical_sheets.optimize', 'technical-sheet:update', 'technical_sheet_optimizer', false],
            ['workspace.technical_sheets.copy', 'technical-sheet:copy', null, false],
            ['workspace.technical_sheets.trash', 'technical-sheet:read', null, true],
            ['workspace.technical_sheets.restore', 'technical-sheet:restore', null, true],
            ['workspace.technical_sheets.purge', 'technical-sheet:purge', null, true],
        ];

        for (const [id, permission, feature, ownerOnly] of cases) {
            const entry = ACTIVE_HELP_REGISTRY.entriesById[id];
            expect(entry, id).toBeDefined();
            expect(entry.context).toBe('workspace');
            expect(entry.audience.permissions).toContain(permission);
            expect(entry.audience.applicationGlobalPermissions).toEqual([]);
            expect(entry.audience.ownerOnly).toBe(ownerOnly);
            expect(entry.requirements.features).toEqual(feature ? [feature] : []);
        }
    });

    it('ne révèle ni optimisation hors offre ni Corbeille aux membres', async () => {
        const resolveWorkspaceAccess = vi.fn(async () => ({
            effectiveCapabilities: { features: [] },
            accessMode: 'normal',
        }));
        const service = createHelpService({
            registry: ACTIVE_HELP_REGISTRY,
            resolveWorkspaceAccess,
        });
        const workspace = { _id: '507f1f77bcf86cd799439011' };
        const permissions = [
            'technical-sheet:read',
            'technical-sheet:update',
            'technical-sheet:export',
        ];
        const catalog = await service.getWorkspaceCatalog({
            workspace,
            permissions,
            role: { key: 'member', isSystem: true },
        });
        const ids = catalog.entries.map((entry) => entry.id);

        expect(ids).toContain('workspace.technical_sheets.read');
        expect(ids).not.toContain('workspace.technical_sheets.optimize');
        expect(ids).not.toContain('workspace.technical_sheets.export');
        expect(ids).not.toContain('workspace.technical_sheets.trash');

        await expect(service.getWorkspaceEntry({
            workspace,
            permissions,
            role: { key: 'member', isSystem: true },
            entryId: 'workspace.technical_sheets.trash',
        })).rejects.toMatchObject({ statusCode: 404 });

        resolveWorkspaceAccess.mockResolvedValue({
            effectiveCapabilities: {
                features: ['technical_sheet_export', 'technical_sheet_optimizer'],
            },
            accessMode: 'normal',
        });
        const authorized = await service.getWorkspaceCatalog({
            workspace,
            permissions: [...permissions, 'technical-sheet:restore', 'technical-sheet:purge'],
            role: { key: 'owner', isSystem: true },
        });
        const authorizedIds = authorized.entries.map((entry) => entry.id);
        expect(authorizedIds).toContain('workspace.technical_sheets.optimize');
        expect(authorizedIds).toContain('workspace.technical_sheets.export');
        expect(authorizedIds).toContain('workspace.technical_sheets.trash');
        expect(authorizedIds).toContain('workspace.technical_sheets.restore');
        expect(authorizedIds).toContain('workspace.technical_sheets.purge');
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