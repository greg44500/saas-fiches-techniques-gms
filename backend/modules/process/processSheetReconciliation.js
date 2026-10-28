import { toIngredientProjection } from './processSheetIngredientProjection.js';

// M-004 official snapshots are immutable. Only manufacturing-relevant data
// participates: a price or supplier revision alone cannot invalidate a process.
const value = (item) => item?.toString?.() ?? null;
const manufacturingSignature = (validation) => JSON.stringify({
    productionQuantity: value(validation.sheetSnapshot?.productionQuantity),
    productionUnit: validation.sheetSnapshot?.productionUnit ?? null,
    portionsPerProductionUnit: value(validation.sheetSnapshot?.portionsPerProductionUnit),
    lines: (validation.linesSnapshot ?? []).map((line) => ({
        kind: line.kind,
        variant: value(line.productVariantId),
        quantity: value(line.netQuantity),
        unit: line.inputUnit,
        order: line.order,
        note: line.note ?? null,
        optimization: {
            min: value(line.optimization?.minNetQuantity),
            max: value(line.optimization?.maxNetQuantity),
            locked: Boolean(line.optimization?.locked),
        },
    })),
});

const processReferenceId = (process) =>
    process.compositionValidation ?? process.sourceValidation;

const referencedLineKeys = (draft) => {
    const keys = new Set();
    for (const phase of draft.phases ?? []) {
        for (const key of phase.ingredientLineKeys ?? []) keys.add(key);
        for (const step of phase.steps ?? []) {
            for (const key of step.ingredientLineKeys ?? []) keys.add(key);
        }
    }
    for (const item of draft.unassignedReasons ?? []) keys.add(item.lineKey);
    return [...keys];
};

const buildReconciliationPlan = ({ previous, current, draft }) => {
    const before = toIngredientProjection({ sourceKind: 'VALIDATION', source: previous });
    const after = toIngredientProjection({ sourceKind: 'VALIDATION', source: current });
    const compositionChanged = manufacturingSignature(previous) !== manufacturingSignature(current);
    const byOldKey = new Map(before.lines.map((line) => [line.lineKey, line]));
    const byNewKey = new Map(after.lines.map((line) => [line.lineKey, line]));
    const oldCount = (variant) =>
        before.lines.filter((line) => line.productVariantId === variant).length;
    const newCount = (variant) =>
        after.lines.filter((line) => line.productVariantId === variant).length;
    const usedTargets = new Set();
    const assignments = referencedLineKeys(draft).map((from) => {
        const oldLine = byOldKey.get(from);
        if (!oldLine) throw new Error('An existing process assignment is absent from its official source.');
        let proposed = byNewKey.get(from);
        if (proposed?.productVariantId !== oldLine.productVariantId) proposed = null;
        // Only identical manufacturing compositions and unique ingredient
        // occurrences permit automatic matching without a stable line ID.
        if (!proposed && !compositionChanged
            && oldCount(oldLine.productVariantId) === 1
            && newCount(oldLine.productVariantId) === 1) {
            proposed = after.lines.find(
                (line) => line.productVariantId === oldLine.productVariantId,
            );
        }
        if (proposed && usedTargets.has(proposed.lineKey)) proposed = null;
        if (proposed) usedTargets.add(proposed.lineKey);
        return {
            from,
            name: oldLine.productVariantName,
            position: oldLine.sourcePosition,
            proposedTo: proposed?.lineKey ?? null,
        };
    });
    return {
        compositionChanged,
        assignments,
        unresolvedCount: assignments.filter((assignment) => !assignment.proposedTo).length,
        oldIngredientCount: before.lines.length,
        newIngredients: after.lines.map((line) => ({
            lineKey: line.lineKey,
            name: line.productVariantName,
            position: line.sourcePosition,
        })),
    };
};

// Explicit decisions include {from, to} where to=null means remove the old
// association. Every previously used key must be accounted for; no guessing.
const applyReconciliationMappings = ({ draft, plan, decisions = [] }) => {
    const allowed = new Set(plan.newIngredients.map((item) => item.lineKey));
    const expected = new Set(plan.assignments.map((item) => item.from));
    const overrides = new Map();
    for (const { from, to } of decisions) {
        if (!expected.has(from) || overrides.has(from)
            || (to !== null && !allowed.has(to))) {
            throw new Error('INVALID_MAPPING');
        }
        overrides.set(from, to);
    }
    const replacements = new Map();
    const targets = new Set();
    for (const assignment of plan.assignments) {
        const to = overrides.has(assignment.from)
            ? overrides.get(assignment.from)
            : assignment.proposedTo;
        if (to === undefined || (to === null && !overrides.has(assignment.from))) {
            throw new Error('MAPPING_REQUIRED');
        }
        if (to !== null && targets.has(to)) throw new Error('DUPLICATE_MAPPING');
        if (to !== null) targets.add(to);
        replacements.set(assignment.from, to);
    }
    const mapKeys = (keys) => keys
        .map((key) => replacements.get(key))
        .filter((key) => key !== null && key !== undefined);
    return {
        phases: (draft.phases ?? []).map((phase) => ({
            ...(phase.toObject?.() ?? phase),
            ingredientLineKeys: mapKeys(phase.ingredientLineKeys ?? []),
            steps: (phase.steps ?? []).map((step) => ({
                ...(step.toObject?.() ?? step),
                ingredientLineKeys: mapKeys(step.ingredientLineKeys ?? []),
            })),
        })),
        unassignedReasons: (draft.unassignedReasons ?? [])
            .filter((item) => replacements.get(item.lineKey) !== null)
            .map((item) => ({
                ...(item.toObject?.() ?? item),
                lineKey: replacements.get(item.lineKey),
            })),
    };
};

export {
    manufacturingSignature, processReferenceId, referencedLineKeys,
    buildReconciliationPlan, applyReconciliationMappings,
};
