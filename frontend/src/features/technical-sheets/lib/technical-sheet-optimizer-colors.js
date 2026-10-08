// Une teinte distincte par position d'ingrédient dans la Fiche de référence.
// Aucun retour cyclique à une palette fixe de dix couleurs.
const GOLDEN_ANGLE = 137.50776405003785;

function colorForIndex(index) {
  const hue = (218 + index * GOLDEN_ANGLE) % 360;

  return {
    base: `hsl(${hue.toFixed(6)} 75% 44%)`,
    strong: `hsl(${hue.toFixed(6)} 78% 31%)`,
  };
}

function buildIngredientColorMap(lines = []) {
  const colors = {};
  let index = 0;

  for (const line of lines) {
    if (line.kind !== 'INGREDIENT') continue;
    colors[line.id] = colorForIndex(index);
    index += 1;
  }

  return colors;
}

function ingredientColor(lineId, colorMap = {}) {
  return colorMap[lineId] ?? colorForIndex(0);
}

function ingredientGraphTone(
  lineId,
  adjustment = 0,
  range = { min: -99, max: 100 },
  colorMap = {},
) {
  const palette = ingredientColor(lineId, colorMap);
  const amplitude = adjustment < 0
    ? Math.abs(range?.min ?? -99)
    : Math.abs(range?.max ?? 100);
  const intensity = amplitude > 0
    ? Math.min(Math.abs(adjustment) / amplitude, 1)
    : 0;

  return {
    bar: intensity >= 0.66 ? palette.strong : palette.base,
    handle: palette.strong,
  };
}

export {
  buildIngredientColorMap,
  ingredientColor,
  ingredientGraphTone,
};
