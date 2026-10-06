import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    loadDefaultDataset,
    loadV8ReferenceDataset,
    m002ReferenceDatasetSchema,
} from '../../seeds/seedM002Reference.js';

const variants = (dataset) => dataset.products.flatMap(
    (product) => product.variants,
);

describe('M-002 professional reference corpus v9', () => {
    it('conserve exactement les identités du v8 et nomme les 64 unités dénombrables', async () => {
        const [v8, candidate] = await Promise.all([
            loadV8ReferenceDataset(),
            loadDefaultDataset(),
        ]);
        const parsed = m002ReferenceDatasetSchema.parse(candidate);

        expect(parsed.version).toBe('m002-reference-v9');
        expect(parsed.categories).toHaveLength(16);
        expect(parsed.products).toHaveLength(381);
        expect(variants(parsed)).toHaveLength(488);
        expect(
            variants(parsed).map(({ name }) => name),
        ).toEqual(
            variants(v8).map(({ name }) => name),
        );

        const countable = variants(parsed).filter(
            ({ referenceUnit }) => referenceUnit === 'UNIT',
        );
        expect(countable).toHaveLength(64);
        expect(countable.every((variant) => (
            Boolean(variant.countUnitLabelSingular)
            && Boolean(variant.countUnitLabelPlural)
        ))).toBe(true);

        expect(
            variants(parsed)
                .filter(({ referenceUnit }) => referenceUnit !== 'UNIT')
                .every((variant) => (
                    variant.countUnitLabelSingular === null
                    && variant.countUnitLabelPlural === null
                )),
        ).toBe(true);
    });

    it('distingue l’unité de recette du conditionnement commercial', async () => {
        const parsed = m002ReferenceDatasetSchema.parse(
            await loadDefaultDataset(),
        );
        const byName = new Map(
            variants(parsed).map((variant) => [variant.name, variant]),
        );

        expect(byName.get('Pain bruschetta surgelé')).toMatchObject({
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'tranche',
            countUnitLabelPlural: 'tranches',
        });
        expect(byName.get('Œuf coquille calibre L')).toMatchObject({
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'œuf',
            countUnitLabelPlural: 'œufs',
        });
        expect(byName.get('Bun brioché surgelé')).toMatchObject({
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'pain',
            countUnitLabelPlural: 'pains',
        });

        for (const variant of variants(parsed)) {
            expect(variant).not.toHaveProperty('packaging');
            expect(variant).not.toHaveProperty('supplier');
            expect(variant).not.toHaveProperty('price');
        }
    });
});
