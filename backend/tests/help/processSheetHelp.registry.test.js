import { describe, expect, it, vi } from 'vitest';

import { ACTIVE_HELP_REGISTRY } from '../../config/applicationHelp.registry.js';
import { createHelpService } from '../../modules/help/help.service.js';
import { PROCESS_SHEET_HELP_MODULE } from '../../modules/process/processSheetHelp.registry.js';
import { PROCESS_SHEET_PERMISSION } from '../../modules/process/processSheetPermission.registry.js';

const prefix = 'workspace.process_sheets.';
const workspace = { _id: '507f1f77bcf86cd799439011' };
const member = { key: 'member', isSystem: true };
const fullPermissions = [
    ...Object.values(PROCESS_SHEET_PERMISSION),
    'technical-sheet:read',
];
const makeService = (accessMode = 'normal') => createHelpService({
    registry: ACTIVE_HELP_REGISTRY,
    resolveWorkspaceAccess: vi.fn(async () => ({
        effectiveCapabilities: { features: [] },
        accessMode,
    })),
});

describe('M-006 — centre d’aide Fiches process', () => {
    it('compose une catégorie valide et neuf fiches distinctes avec des liens résolus', () => {
        const category = ACTIVE_HELP_REGISTRY.categoriesById.workspace_process_sheets;
        expect(category).toMatchObject({
            label: 'Fiches process',
            context: 'workspace',
        });
        expect(PROCESS_SHEET_HELP_MODULE.entries).toHaveLength(9);
        const ids = PROCESS_SHEET_HELP_MODULE.entries.map(({ id }) => id);
        expect(new Set(ids).size).toBe(ids.length);

        for (const entry of PROCESS_SHEET_HELP_MODULE.entries) {
            expect(ACTIVE_HELP_REGISTRY.entriesById[entry.id]).toBeDefined();
            expect(entry.id.startsWith(prefix)).toBe(true);
            expect(entry.categoryId).toBe(category.id);
            expect(entry.requirements.features).toEqual([]);
            expect(entry.audience.applicationGlobalPermissions).toEqual([]);
            expect(entry.steps.length).toBeGreaterThan(0);
            expect(entry.search.questions.length).toBeGreaterThan(0);
            for (const relatedId of entry.relatedEntryIds) {
                expect(ids, relatedId).toContain(relatedId);
            }
        }
        expect(PROCESS_SHEET_HELP_MODULE.workspaceRemediationEntryIds).toEqual([]);
    });

    it('documente les contrats sensibles et les actions de finalisation', () => {
        const entry = (suffix) => ACTIVE_HELP_REGISTRY.entriesById[prefix + suffix];
        expect(entry('create').prerequisites.join(' ')).toMatch(/validation officielle/);
        expect(entry('create').prerequisites.join(' ')).toMatch(/sans brouillon/);
        expect(entry('validate').edgeCases.join(' ')).toMatch(/non affectés n’empêchent pas/);
        expect(entry('save').edgeCases.join(' ')).toMatch(/repasse à Brouillon/);
        expect(entry('reconcile').edgeCases.join(' ')).toMatch(/prix, quantité, unité, fournisseur/);
        expect(entry('states').edgeCases.join(' ')).toMatch(/PDF.*process-sheet:export/);
        expect(entry('states').edgeCases.join(' ')).toMatch(/suppression autonome.*process-sheet:delete/);
        expect(entry('phase_titles').edgeCases.join(' ')).toMatch(/ne copie pas les étapes/);

        const allSteps = PROCESS_SHEET_HELP_MODULE.entries.flatMap(({ steps }) => steps);
        expect(allSteps).toContainEqual(expect.stringMatching(/téléchargez.*PDF/i));
        expect(allSteps).toContainEqual(expect.stringMatching(/sélectionnez Supprimer/i));
    });

    it('exige les permissions métier adaptées à chaque parcours', () => {
        const expectations = {
            read: ['process-sheet:read'],
            create: ['process-sheet:read', 'process-sheet:create', 'technical-sheet:read'],
            organize: ['process-sheet:read', 'process-sheet:edit'],
            phase_titles: ['process-sheet:read', 'process-sheet:edit'],
            ingredients: ['process-sheet:read', 'process-sheet:edit'],
            save: ['process-sheet:read', 'process-sheet:edit'],
            validate: ['process-sheet:read', 'process-sheet:validate'],
            reconcile: ['process-sheet:read', 'process-sheet:edit', 'process-sheet:validate'],
            states: ['process-sheet:read'],
        };
        for (const [suffix, permissions] of Object.entries(expectations)) {
            expect(ACTIVE_HELP_REGISTRY.entriesById[prefix + suffix]
                .audience.permissions).toEqual(permissions);
        }
    });

    it('filtre catalogue, consultation et liens selon les permissions effectives', async () => {
        const service = makeService();
        const reader = { workspace, permissions: ['process-sheet:read'], role: member };
        const visible = await service.getWorkspaceCatalog(reader);
        const ids = visible.entries.filter(({ id }) => id.startsWith(prefix)).map(({ id }) => id);
        expect(ids).toEqual([prefix + 'read', prefix + 'states']);

        const read = await service.getWorkspaceEntry({
            ...reader, entryId: prefix + 'read',
        });
        expect(read.relatedEntryIds).toEqual([prefix + 'states']);
        await expect(service.getWorkspaceEntry({
            ...reader, entryId: prefix + 'create',
        })).rejects.toMatchObject({ statusCode: 404 });
        await expect(service.getWorkspaceEntry({
            ...reader, entryId: prefix + 'reconcile',
        })).rejects.toMatchObject({ statusCode: 404 });

        const authorized = { workspace, permissions: fullPermissions, role: member };
        const catalog = await service.getWorkspaceCatalog(authorized);
        expect(catalog.entries.filter(({ id }) => id.startsWith(prefix))).toHaveLength(9);
        const reconcile = await service.getWorkspaceEntry({
            ...authorized, entryId: prefix + 'reconcile',
        });
        expect(reconcile.relatedEntryIds).toContain(prefix + 'validate');
        expect(reconcile.search.keywords).toContain('composition');
    });

    it('ne divulgue pas le corpus métier en mode remédiation', async () => {
        const service = makeService('remediation');
        const reader = { workspace, permissions: fullPermissions, role: member };
        const catalog = await service.getWorkspaceCatalog(reader);
        expect(catalog.entries.some(({ id }) => id.startsWith(prefix))).toBe(false);
        expect(catalog.categories.some(({ id }) => id === 'workspace_process_sheets')).toBe(false);
        await expect(service.getWorkspaceEntry({
            ...reader, entryId: prefix + 'read',
        })).rejects.toMatchObject({ statusCode: 404 });
    });
});
