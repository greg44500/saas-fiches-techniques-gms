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

const normalizeProductSearchToken = (token) => {
    const normalized = normalizeProductText(token);
    if (normalized.length <= 3) return normalized;
    if (normalized.endsWith('eaux')) return normalized.slice(0, -1);
    if (normalized.endsWith('aux') && normalized.length > 4) {
        return `${normalized.slice(0, -3)}al`;
    }
    if (
        normalized.endsWith('s')
        && !normalized.endsWith('ss')
        && normalized.length > 4
    ) {
        return normalized.slice(0, -1);
    }
    return normalized;
};

const tokenizeProductSearch = (value) => normalizeProductText(value)
    .split(' ')
    .map(normalizeProductSearchToken)
    .filter(Boolean);

const productSearchTokenMatches = (requested, candidate) => {
    if (requested === candidate) return true;
    if (requested.length < 4 || candidate.length < 4) return false;
    const shortest = Math.min(requested.length, candidate.length);
    const threshold = shortest <= 6 ? 1 : 2;
    return levenshteinDistance(requested, candidate) <= threshold;
};

const productSearchValueContainedInQuery = (query, value) => {
    const requestedTokens = tokenizeProductSearch(query);
    const valueTokens = tokenizeProductSearch(value);
    if (requestedTokens.length === 0 || valueTokens.length === 0) {
        return false;
    }

    return valueTokens.every((valueToken) => requestedTokens.some(
        (requestedToken) => productSearchTokenMatches(
            requestedToken,
            valueToken,
        ),
    ));
};

const matchesProductSearchValues = (query, values = []) => {
    const requestedTokens = tokenizeProductSearch(query);
    const candidateTokens = [
        ...new Set(
            values.flatMap(tokenizeProductSearch),
        ),
    ];

    if (requestedTokens.length === 0 || candidateTokens.length === 0) {
        return false;
    }

    return requestedTokens.every((requestedToken) => candidateTokens.some(
        (candidateToken) => productSearchTokenMatches(
            requestedToken,
            candidateToken,
        ),
    ));
};

const buildVariantSignature = (input = {}) => {
    const usesStructuredIdentity = (
        Object.prototype.hasOwnProperty.call(input, 'varietyId')
        || Object.prototype.hasOwnProperty.call(input, 'characteristics')
    );

    if (!usesStructuredIdentity) {
        return [
            normalizeProductText(input.presentation) || '_',
            input.foodRange === null || input.foodRange === undefined
                ? '_'
                : String(input.foodRange),
            normalizeProductText(input.processingState) || '_',
        ].join('|');
    }

    const varietyId = input.varietyId?._id
        ?? input.varietyId
        ?? null;
    const characteristicParts = [...(input.characteristics ?? [])]
        .map((characteristic) => ({
            kind: characteristic.kind ?? '_',
            id: (
                characteristic.id
                ?? characteristic._id
                ?? characteristic.characteristicId
                ?? characteristic
            ).toString(),
        }))
        .sort((left, right) => (
            left.kind.localeCompare(right.kind)
            || left.id.localeCompare(right.id)
        ))
        .map(({ kind, id }) => `${kind}:${id}`);

    return [
        `v:${varietyId ? varietyId.toString() : '_'}`,
        `c:${characteristicParts.length > 0 ? characteristicParts.join(',') : '_'}`,
        `r:${input.foodRange === null || input.foodRange === undefined
            ? '_'
            : String(input.foodRange)}`,
        `s:${normalizeProductText(input.processingState) || '_'}`,
    ].join('|');
};

export {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    isNearDuplicateKey,
    levenshteinDistance,
    matchesProductSearchValues,
    normalizeProductSearchToken,
    normalizeProductText,
    productSearchValueContainedInQuery,
    tokenizeProductSearch,
};
