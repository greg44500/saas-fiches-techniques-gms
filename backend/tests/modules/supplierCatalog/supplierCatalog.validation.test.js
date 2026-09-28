import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    editionBodySchema,
    importPreviewBodySchema,
} from '../../../modules/supplierCatalog/supplierCatalog.validation.js';

const objectId =
    '507f1f77bcf86cd799439011';

describe('M-003 supplier catalog validation', () => {
    it('charge le schéma de preview sans composer omit après refinement', () => {
        expect(importPreviewBodySchema).toBeDefined();
    });

    it('applique la même validation de période à une édition standard', () => {
        const result = editionBodySchema.safeParse({
            supplierId: objectId,
            name: 'Catalogue septembre 2026',
            validFrom: '2026-09-30T00:00:00.000Z',
            validTo: '2026-09-01T00:00:00.000Z',
        });

        expect(result.success).toBe(false);
        expect(result.error.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ['validTo'],
                    message:
                        'La fin de validité doit être postérieure ou égale au début.',
                }),
            ]),
        );
    });

    it('applique la même validation de période à une édition importée sans supplierId embarqué', () => {
        const result = importPreviewBodySchema.safeParse({
            supplierId: objectId,
            edition: {
                name: 'Catalogue septembre 2026',
                validFrom: '2026-09-30T00:00:00.000Z',
                validTo: '2026-09-01T00:00:00.000Z',
            },
            mapping: {
                supplierReference: 0,
                designation: 1,
            },
        });

        expect(result.success).toBe(false);
        expect(result.error.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ['edition', 'validTo'],
                    message:
                        'La fin de validité doit être postérieure ou égale au début.',
                }),
            ]),
        );
    });
});
