const PALETTE = Object.freeze([
  { base: '#2563eb', strong: '#1d4ed8' },
  { base: '#d97706', strong: '#b45309' },
  { base: '#059669', strong: '#047857' },
  { base: '#7c3aed', strong: '#5b21b6' },
  { base: '#dc2626', strong: '#b91c1c' },
  { base: '#0891b2', strong: '#0e7490' },
  { base: '#65a30d', strong: '#4d7c0f' },
  { base: '#ea580c', strong: '#c2410c' },
  { base: '#db2777', strong: '#9d174d' },
  { base: '#0d9488', strong: '#0f766e' },
]);

function buildIngredientColorMap(lines = []) {
  const colors = {};
  let index = 0;

  for (const line of lines) {
    if (line.kind !== 'INGREDIENT') continue;
    colors[line.id] = PALETTE[index % PALETTE.length];
    index += 1;
  }

  return colors;
}

function ingredientColor(lineId, colorMap = {}) {
  return colorMap[lineId] ?? PALETTE[0];
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
