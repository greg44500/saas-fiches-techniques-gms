function compactNavigationSeparators(navigation) {
  const compacted = [];

  navigation.forEach((entry) => {
    if (entry.type !== 'separator') {
      compacted.push(entry);
      return;
    }

    if (
      compacted.length > 0
      && compacted.at(-1)?.type !== 'separator'
    ) {
      compacted.push(entry);
    }
  });

  while (compacted.at(-1)?.type === 'separator') {
    compacted.pop();
  }

  return compacted;
}

export { compactNavigationSeparators };
