// Une date civile saisie dans une liste tarifaire est stockée à minuit UTC.
// Elle désigne toute la journée, tandis qu'une date horodatée (import immédiat)
// conserve sa précision à la seconde. Europe/Paris est le fuseau métier V1.
const parisDay = (date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(date));
    const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
    return value.year + '-' + value.month + '-' + value.day;
};

const civilDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().endsWith('T00:00:00.000Z')
        ? date.toISOString().slice(0, 10) : null;
};

const startsBy = (from, atDate) => !from
    || (civilDate(from)
        ? civilDate(from) <= parisDay(atDate)
        : new Date(from).getTime() <= new Date(atDate).getTime());

const endsAfter = (to, atDate) => !to
    || (civilDate(to)
        ? civilDate(to) >= parisDay(atDate)
        : new Date(to).getTime() >= new Date(atDate).getTime());

const tariffIsApplicable = (tariff, atDate) =>
    startsBy(tariff.validFrom, atDate) && endsAfter(tariff.validTo, atDate);

const tariffIsExpired = (tariff, atDate) =>
    Boolean(tariff.validTo) && !endsAfter(tariff.validTo, atDate);

const effectiveBoundary = (value, isEnd) => {
    if (!value) return isEnd ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    const date = new Date(value);
    if (civilDate(value)) {
        // Clé ordonnable des journées civiles pour le tri des périodes.
        const day = date.toISOString().slice(0, 10);
        // Les dates source sans heure sont des bornes de jour inclusives.
        return Date.parse(day + 'T00:00:00.000Z') + (isEnd ? 86400000 - 1 : 0);
    }
    return date.getTime();
};

// Comparer les calendriers métier lorsque l'une des bornes est une date
// civile : les changements d'heure Paris ne déplacent pas l'échéance.
const startsBeforeEnd = (from, to) => {
    if (!from || !to) return true;
    const fromDay = civilDate(from);
    const toDay = civilDate(to);
    if (fromDay && toDay) return fromDay <= toDay;
    if (fromDay) return fromDay <= parisDay(to);
    if (toDay) return parisDay(from) <= toDay;
    return new Date(from).getTime() <= new Date(to).getTime();
};

const tariffPeriodsOverlap = (a, b) =>
    startsBeforeEnd(a.validFrom, b.validTo)
    && startsBeforeEnd(b.validFrom, a.validTo);

const compareRecentExpired = (a, b) => (
    effectiveBoundary(b.validTo, true) - effectiveBoundary(a.validTo, true)
    || effectiveBoundary(b.validFrom, false) - effectiveBoundary(a.validFrom, false)
    || String(b._id).localeCompare(String(a._id))
);

// Les tarifs supplantés (isCurrent=false) ne sont jamais éligibles.
// Les éditions Catalogue archivées sont également ignorées par l'appelant.
const selectSupplierTariffs = (tariffs, atDate) => {
    const eligible = tariffs.filter((tariff) => tariff.isCurrent);
    const applicable = eligible.filter((tariff) => tariffIsApplicable(tariff, atDate));
    if (applicable.length > 1) return { status: 'AMBIGUOUS', tariff: null };
    if (applicable.length === 1) return { status: 'AVAILABLE', tariff: applicable[0] };
    const expired = eligible.filter((tariff) => tariffIsExpired(tariff, atDate))
        .sort(compareRecentExpired);
    if (expired.length) return { status: 'EXPIRED', tariff: expired[0] };
    return { status: 'UNAVAILABLE', tariff: null };
};

export {
    civilDate, parisDay, tariffIsApplicable, tariffPeriodsOverlap,
    selectSupplierTariffs,
};
