import { describe, expect, it } from 'vitest';

import {
  buildIngredientColorMap,
  ingredientColor,
  ingredientGraphTone,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer-colors';

describe('Couleurs de l’Atelier M-005', () => {
  it('attribue une couleur distincte aux ingrédients même au-delà de dix lignes', () => {
    const lines = Array.from({ length: 25 }, (_, index) => ({
      id: `ingredient-${index}`,
      kind: 'INGREDIENT',
    }));
    const colors = buildIngredientColorMap(lines);
    const bases = Object.values(colors).map((tone) => tone.base);

    expect(new Set(bases).size).toBe(lines.length);
    expect(ingredientColor(lines[0].id, colors).base).toBe(bases[0]);
    expect(ingredientGraphTone(lines[0].id, 0, undefined, colors).bar).toBe(bases[0]);
  });

  it('ignore les lignes hors ingrédients et fonce la teinte aux extrêmes', () => {
    const colors = buildIngredientColorMap([
      { id: 'a', kind: 'INGREDIENT' },
      { id: 'b', kind: 'ECONOMAT' },
      { id: 'c', kind: 'INGREDIENT' },
    ]);

    expect(Object.keys(colors)).toEqual(['a', 'c']);
    expect(colors.a.base).not.toBe(colors.c.base);
    expect(ingredientGraphTone('a', 100, undefined, colors).bar).toBe(colors.a.strong);
    expect(ingredientGraphTone('a', -99, undefined, colors).bar).toBe(colors.a.strong);
  });
});
