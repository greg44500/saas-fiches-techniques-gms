import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../../config/applicationCapability.registry.js';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_TERM_TYPE,
} from '../../../constants/subscription.constants.js';

import {
    isBaselinePlan,
} from '../../plan/plan.service.js';
import {
    hasConsumedTrial,
} from '../../trialEligibility/trialEligibility.service.js';
import { Subscription } from '../subscription.model.js';
import {
    getWorkspaceAccessEntitlement,
} from '../subscription.service.js';
import {
    resolveCurrentWorkspaceOwner,
} from './grantTrial.helpers.js';

const serializePlan = (plan) => {
    if (!plan) {
        return null;
    }

    const limits = plan.limits instanceof Map
        ? Object.fromEntries(plan.limits)
        : { ...(plan.limits ?? {}) };

    return {
        id: plan._id.toString(),
        isBaseline: isBaselinePlan(plan),
        name: plan.name,
        features: [...(plan.features ?? [])],
        limits,
    };
};

const serializeSubscription = (subscription) => {
    if (!subscription) {
        return null;
    }

    const scheduledChange = subscription.scheduledChange
        ? {
            type: subscription.scheduledChange.type,
            targetPlan: serializePlan(
                subscription.scheduledChange.targetPlan,
            ),
            targetBillingInterval:
                subscription.scheduledChange.targetBillingInterval,
            effectiveAt: subscription.scheduledChange.effectiveAt,
            requestedAt: subscription.scheduledChange.requestedAt,
        }
        : null;

    return {
        id: subscription._id.toString(),
        kind: subscription.kind,
        termType: subscription.termType ?? null,
        status: subscription.status,
        plan: serializePlan(subscription.plan),
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        billingInterval: subscription.billingInterval,
        scheduledChange,
    };
};

const hasFeature = (plan, featureKey) =>
    Array.isArray(plan?.features)
    && plan.features.includes(featureKey);

const toValidDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const sameSubscription = (left, right) =>
    left?._id?.toString?.() === right?._id?.toString?.();

const buildCapabilityPresentations = ({
    features,
    limits,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    const featurePresentations = Object.fromEntries(
        features.flatMap((featureKey) => {
            const definition = registry.getFeatureDefinition(featureKey);
            return definition ? [[featureKey, definition]] : [];
        }),
    );
    const limitPresentations = Object.fromEntries(
        Object.keys(limits).flatMap((metricKey) => {
            const presentation = registry.getMetricPresentation(metricKey);
            return presentation ? [[metricKey, presentation]] : [];
        }),
    );

    return {
        featurePresentations,
        limitPresentations,
    };
};

/**
 * Construit une projection utilisateur de la durée des fonctionnalités déjà
 * résolues comme effectives. Les métadonnées internes des dérogations
 * (origine, motif, auteur) restent volontairement absentes du DTO public.
 */
const buildFeatureAvailability = ({
    access,
    baselinePlan = null,
    commercialSubscription = null,
}) => {
    const features = access?.effectiveCapabilities?.features;
    const appliedOverrides = access?.effectiveCapabilities?.appliedOverrides;

    if (!Array.isArray(features) || !Array.isArray(appliedOverrides)) {
        throw new TypeError(
            'Workspace effective feature availability is incomplete.',
        );
    }

    return Object.fromEntries(features.map((featureKey) => {
        let openEnded = false;
        const boundedEnds = [];
        const currentSubscription = access.subscription;
        const currentPlan = access.plan;

        if (hasFeature(currentPlan, featureKey)) {
            if (
                currentSubscription.kind === SUBSCRIPTION_KIND.BASELINE
                || currentSubscription.termType === SUBSCRIPTION_TERM_TYPE.OPEN_ENDED
            ) {
                openEnded = true;
            } else if (currentSubscription.status === SUBSCRIPTION_STATUS.TRIALING) {
                if (hasFeature(baselinePlan, featureKey)) {
                    openEnded = true;
                } else {
                    const trialEnd = toValidDate(currentSubscription.trialEndsAt);
                    if (trialEnd) boundedEnds.push(trialEnd);
                }
            } else if (currentSubscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
                const activeCommercial = sameSubscription(
                    currentSubscription,
                    commercialSubscription,
                )
                    ? commercialSubscription
                    : null;
                const scheduledChange = activeCommercial?.scheduledChange;

                if (scheduledChange?.targetPlan && scheduledChange?.effectiveAt) {
                    if (hasFeature(scheduledChange.targetPlan, featureKey)) {
                        openEnded = true;
                    } else {
                        const effectiveAt = toValidDate(scheduledChange.effectiveAt);
                        if (effectiveAt) boundedEnds.push(effectiveAt);
                    }
                } else if (currentSubscription.cancelAtPeriodEnd) {
                    if (hasFeature(baselinePlan, featureKey)) {
                        openEnded = true;
                    } else {
                        const periodEnd = toValidDate(currentSubscription.currentPeriodEnd);
                        if (periodEnd) boundedEnds.push(periodEnd);
                    }
                } else {
                    // Une fin de période renouvelable n'est pas une fin de droit programmée.
                    openEnded = true;
                }
            }
        }

        for (const override of appliedOverrides) {
            if (
                override?.targetType !== 'feature'
                || override.featureKey !== featureKey
                || override.featureEnabled !== true
            ) {
                continue;
            }

            if (override.endsAt == null) {
                openEnded = true;
                continue;
            }

            const overrideEnd = toValidDate(override.endsAt);
            if (overrideEnd) boundedEnds.push(overrideEnd);
        }

        if (openEnded) {
            return [featureKey, {
                mode: 'open_ended',
                endsAt: null,
            }];
        }

        if (boundedEnds.length === 0) {
            throw new TypeError(
                `Unable to resolve availability for effective feature "${featureKey}".`,
            );
        }

        const endsAt = boundedEnds.reduce((latest, candidate) => (
            candidate > latest ? candidate : latest
        ));

        return [featureKey, {
            mode: 'bounded',
            endsAt,
        }];
    }));
};

const serializeWorkspaceEffectiveEntitlement = (
    access,
    {
        baselinePlan = null,
        commercialSubscription = null,
        registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    } = {},
) => {
    if (
        !access?.subscription
        || !access?.plan
        || !access?.effectiveCapabilities
        || !Array.isArray(
            access.effectiveCapabilities.features,
        )
    ) {
        throw new TypeError(
            'Workspace effective entitlement is incomplete.',
        );
    }

    const rawLimits = access.effectiveCapabilities.limits;

    if (
        rawLimits === null
        || typeof rawLimits !== 'object'
        || Array.isArray(rawLimits)
    ) {
        throw new TypeError(
            'Workspace effective entitlement limits are invalid.',
        );
    }

    const limits = rawLimits instanceof Map
        ? Object.fromEntries(rawLimits)
        : { ...rawLimits };
    const {
        featurePresentations,
        limitPresentations,
    } = buildCapabilityPresentations({
        features: access.effectiveCapabilities.features,
        limits,
        registry,
    });

    return {
        plan: serializePlan(access.plan),
        features: [
            ...access.effectiveCapabilities.features,
        ],
        featureAvailability: buildFeatureAvailability({
            access,
            baselinePlan,
            commercialSubscription,
        }),
        limits,
        featurePresentations,
        limitPresentations,
        subscriptionKind: access.subscription.kind,
        subscriptionTermType: access.subscription.termType ?? null,
        subscriptionStatus: access.subscription.status,
        accessMode: access.accessMode,
        reason: access.reason,
        blockingLimits: access.blockingLimits,
        nonBlockingLimits: access.nonBlockingLimits,
    };
};

const getWorkspaceSubscriptionOverview = async ({
    workspaceId,
    session,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to read workspace subscription overview',
        );
    }

    const buildQuery = (filter) => {
        let query = Subscription.findOne({
            workspace: workspaceId,
            ...filter,
        })
            .populate({
                path: 'plan',
            })
            .populate({
                path: 'scheduledChange.targetPlan',
            });

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    const baselineQuery = buildQuery({
        kind: SUBSCRIPTION_KIND.BASELINE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
    });

    const commercialQuery = buildQuery({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
    }).sort({
        createdAt: -1,
    });

    let baseline;
    let commercial;
    let access;
    let owner;

    if (session) {
        baseline = await baselineQuery;
        commercial = await commercialQuery;
        access = await getWorkspaceAccessEntitlement({
            workspaceId,
            session,
        });
        owner = await resolveCurrentWorkspaceOwner({
            workspaceId,
            session,
        });
    } else {
        [baseline, commercial, access, owner] = await Promise.all([
            baselineQuery,
            commercialQuery,
            getWorkspaceAccessEntitlement({
                workspaceId,
                session: null,
            }),
            resolveCurrentWorkspaceOwner({
                workspaceId,
                session: null,
            }),
        ]);
    }

    const trialConsumed = await hasConsumedTrial({
        emailCanonical: owner.emailCanonical,
        session: session ?? null,
    });

    return {
        baseline: serializeSubscription(baseline),
        commercial: serializeSubscription(commercial),
        effectiveEntitlement:
            serializeWorkspaceEffectiveEntitlement(access, {
                baselinePlan: baseline?.plan ?? null,
                commercialSubscription: commercial,
            }),
        trialEligibility: {
            consumed: trialConsumed,
        },
    };
};

export {
    buildCapabilityPresentations,
    buildFeatureAvailability,
    getWorkspaceSubscriptionOverview,
    serializePlan,
    serializeSubscription,
    serializeWorkspaceEffectiveEntitlement,
};
