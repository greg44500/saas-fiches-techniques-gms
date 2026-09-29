import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    createSupplierBodySchema,
    updateSupplierBodySchema,
} from '../../../modules/supplierCatalog/supplierReference.validation.js';

const categoryA = '507f1f77bcf86cd799439011';
const categoryB = '507f191e810c19729de860ea';

describe('M-003 supplier reference validation', () => {
    it('accepte plusieurs catégories Produit distinctes', () => {
        const result = createSupplierBodySchema.safeParse({
            name: 'Grossiste multi-catégories',
            categoryIds: [categoryA, categoryB],
        });

        expect(result.success).toBe(true);
        expect(result.data.categoryIds).toEqual([
            categoryA,
            categoryB,
        ]);
    });

    it('refuse une catégorie répétée', () => {
        const result = updateSupplierBodySchema.safeParse({
            categoryIds: [categoryA, categoryA],
        });

        expect(result.success).toBe(false);
        expect(result.error.issues).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: ['categoryIds'],
                    message:
                        'Une catégorie ne peut être sélectionnée qu’une seule fois.',
                }),
            ]),
        );
    });
});
