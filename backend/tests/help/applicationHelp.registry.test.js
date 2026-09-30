import { describe, expect, it } from 'vitest';

import {
    ACTIVE_HELP_REGISTRY,
    APPLICATION_HELP_MODULES,
} from '../../config/applicationHelp.registry.js';

describe('application Help registry', () => {
    it('compose le corpus Core avec les quatre modules métier livrés', () => {
        expect(APPLICATION_HELP_MODULES.map(({ key }) => key)).toEqual([
            'dossiers',
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
