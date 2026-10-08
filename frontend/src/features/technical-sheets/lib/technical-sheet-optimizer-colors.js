function ingredientHue(lineId) {
  let hash = 0;

  for (const character of String(lineId)) {
    hash = (
      (hash * 31 + character.charCodeAt(0))
      >>> 0
    );
  }

  return hash % 360;
}

function ingredientColor(
  lineId,
  adjustment = 0,
  range = { min: -99, max: 100 },
) {
  const hue = ingredientHue(lineId);
  const amplitude = adjustment < 0
    ? Math.abs(range.min)
    : Math.abs(range.max);
  const intensity = amplitude > 0
    ? Math.min(Math.max(Math.abs(adjustment) / amplitude, 0), 1)
    : 0;
  const lightness = 72 - intensity * 30;

  return {
    bar: `hsl(${hue} 69% ${lightness}%)`,
    handle: `hsl(${hue} 78% ${Math.max(lightness - 12, 28)}%)`,
  };
}

export { ingredientColor };
