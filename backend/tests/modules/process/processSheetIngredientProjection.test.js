import { describe, expect, it } from 'vitest';

import {
    toIngredientProjection,
} from '../../../modules/process/processSheetIngredientProjection.js';

const sameVariant = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const secondVariant = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const id1 = 'cccccccccccccccccccccccc';
const id2 = 'dddddddddddddddddddddddd';
const documentId = 'eeeeeeeeeeeeeeeeeeeeeeee';

describe('M-006 — identité des ingrédients provenant de M-004', () => {
    it('conserve les identités des occurrences répétées de la même Référence Produit', () => {
        const draft = {
            _id: documentId,
            revision: 3,
            lines: [
                {
                    _id: id1, kind: 'INGREDIENT',
                    productVariant: { _id: sameVariant, name: 'Carotte' },
                    order: 1,
                },
                {
                    _id: id2, kind: 'INGREDIENT',
                    productVariant: { _id: sameVariant, name: 'Carotte' },
                    order: 0,
                },
                {
                    _id: 'ffffffffffffffffffffffff',
                    kind: 'ECONOMAT',
                    productVariant: { _id: secondVariant, name: 'Papier' },
                    order: 2,
                },
            ],
        };
        const projection = toIngredientProjection({
            sourceKind: 'DRAFT', source: draft,
        });
        expect(projection.lines.map(({ lineKey }) => lineKey))
            .toEqual(['line:' + id2, 'line:' + id1]);
        expect(projection.groupedIngredients).toEqual([{
            productVariantId: sameVariant,
            productVariantName: 'Carotte',
            lineKeys: ['line:' + id2, 'line:' + id1],
        }]);
        expect(projection.revision).toBe(3);
        expect(projection.hasLegacyLineIdentity).toBe(false);
        expect(JSON.stringify(projection)).not.toContain('netQuantity');
    });

    it('conserve le même identifiant de ligne après validation M-004 nouvelle', () => {
        const projection = toIngredientProjection({
            sourceKind: 'VALIDATION',
            source: {
                _id: documentId,
                linesSnapshot: [{
                    kind: 'INGREDIENT',
                    productVariantId: sameVariant,
                    productVariantName: 'Carotte',
                    sourceLineId: id1,
                    order: 0,
                }],
            },
        });
        expect(projection.lines[0].lineKey).toBe('line:' + id1);
        expect(projection.hasLegacyLineIdentity).toBe(false);
        expect(projection.revision).toBeNull();
    });

    it('isole les anciennes validations sans ID de ligne et sans collision de doublons', () => {
        const projection = toIngredientProjection({
            sourceKind: 'VALIDATION',
            source: {
                _id: documentId,
                linesSnapshot: [0, 1].map((order) => ({
                    kind: 'INGREDIENT', order,
                    productVariantId: sameVariant,
                    productVariantName: 'Carotte',
                })),
            },
        });
        expect(projection.hasLegacyLineIdentity).toBe(true);
        expect(projection.lines.map(({ lineKey }) => lineKey)).toEqual([
            'validation:' + documentId + ':index:0',
            'validation:' + documentId + ':index:1',
        ]);
        expect(projection.groupedIngredients[0].lineKeys).toHaveLength(2);
        expect(projection.lines.map(({ identityKind }) => identityKind))
            .toEqual(['LEGACY_POSITION', 'LEGACY_POSITION']);
    });

    it('ne peut pas accepter deux lignes qui revendiquent la même identité stable', () => {
        const source = {
            _id: documentId,
            revision: 0,
            lines: [0, 1].map((order) => ({
                _id: id1,
                kind: 'INGREDIENT', order,
                productVariant: { _id: sameVariant, name: 'Carotte' },
            })),
        };
        expect(() => toIngredientProjection({
            sourceKind: 'DRAFT', source,
        })).toThrow('Duplicate composition line identity.');
    });

    it('refuse un type de source non géré', () => {
        expect(() => toIngredientProjection({
            sourceKind: 'AUTO', source: {},
        })).toThrow(TypeError);
    });
});
