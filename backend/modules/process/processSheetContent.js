// Compare persisted M-006 content, ignoring object key ordering but preserving
// phase, step and ingredient order. Technical metadata is never passed here.
const canonical = (value) => JSON.stringify(value, (_key, entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
    return Object.fromEntries(Object.entries(entry)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)));
});

const hasProcessContentChanged = (current, candidate) =>
    canonical(current) !== canonical(candidate);

export { hasProcessContentChanged };
