const normalizeProductText = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['’`\-_/]+/g, ' ')
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const buildSearchKeys = (name, aliases = []) => [
    ...new Set(
        [name, ...aliases]
            .map(normalizeProductText)
            .filter(Boolean),
    ),
];

const buildSearchGrams = (searchKeys = []) => {
    const grams = new Set();

    for (const key of searchKeys) {
        const compact = key.replace(/\s+/g, ' ');
        const size = compact.length < 3 ? compact.length : 3;

        if (size === 0) {
            continue;
        }

        for (let index = 0; index <= compact.length - size; index += 1) {
            grams.add(compact.slice(index, index + size));
        }
    }

    return [...grams].sort();
};

const levenshteinDistance = (left, right) => {
    const a = normalizeProductText(left);
    const b = normalizeProductText(right);

    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
        const current = [i];

        for (let j = 1; j <= b.length; j += 1) {
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
        }

        previous.splice(0, previous.length, ...current);
    }

    return previous[b.length];
};

const isNearDuplicateKey = (left, right) => {
    const a = normalizeProductText(left);
    const b = normalizeProductText(right);

    if (!a || !b || a === b) {
        return false;
    }

    const shortest = Math.min(a.length, b.length);
    const threshold = shortest <= 6 ? 1 : 2;

    if (levenshteinDistance(a, b) <= threshold) {
        return true;
    }

    return shortest >= 4 && (a.includes(b) || b.includes(a));
};

const buildVariantSignature = ({
    form = null,
    processingState = null,
    preservation = null,
} = {}) => [
    normalizeProductText(form) || '_',
    normalizeProductText(processingState) || '_',
    normalizeProductText(preservation) || '_',
].join('|');

export {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    isNearDuplicateKey,
    levenshteinDistance,
    normalizeProductText,
};
