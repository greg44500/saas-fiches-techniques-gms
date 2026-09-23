import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
    composePlanCapabilityExtensions,
    createPlanCapabilityRegistry,
} from '../modules/plan/planCapability.registry.js';
import {
    PRODUCT_CATALOG_CAPABILITY_MODULE,
} from '../modules/productCatalog/productCatalogCapability.registry.js';


const CORE_PLAN_FEATURE_METRICS = Object.freeze({
    [CORE_PLAN_FEATURE.FILE_UPLOAD]: Object.freeze([
        CORE_PLAN_METRIC.STORAGE_BYTES,
        CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY,
    ]),
    [CORE_PLAN_FEATURE.TEAM_MANAGEMENT]: Object.freeze([
        CORE_PLAN_METRIC.MEMBERS,
    ]),
});


/**
 * Point de composition unique des capabilities de l'application.
 *
 * Le Core reste volontairement vide de capabilities métier. Après clonage,
 * l'application dérivée importe ici les descriptors de ses modules métier puis
 * les ajoute à cette liste. Aucun `.env` n'est requis : une capability existe
 * parce que le code correspondant est réellement embarqué dans l'application.
 *
 * Exemple après clonage :
 *
 * import { productPlanCapabilities }
 *     from '../modules/products/productPlanCapabilities.js';
 *
 * const APPLICATION_PLAN_CAPABILITY_MODULES = Object.freeze([
 *     productPlanCapabilities,
 * ]);
 */
const APPLICATION_PLAN_CAPABILITY_MODULES = Object.freeze([
    PRODUCT_CATALOG_CAPABILITY_MODULE,
]);

const ACTIVE_PLAN_CAPABILITY_REGISTRY = createPlanCapabilityRegistry(
    composePlanCapabilityExtensions(
        APPLICATION_PLAN_CAPABILITY_MODULES,
    ),
);


/**
 * Associe explicitement une feature aux métriques qui configurent son usage.
 *
 * Cette relation sert à la présentation et à la composition applicative ; elle
 * n'accorde aucun entitlement et ne remplace jamais les contrôles de quotas.
 * Un module métier peut ajouter `featureMetrics` à son descriptor capabilities.
 */
const composeFeatureMetricRelations = ({
    modules = [],
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
} = {}) => {
    if (!Array.isArray(modules)) {
        throw new TypeError('modules must be an array');
    }

    const relations = Object.fromEntries(
        Object.entries(CORE_PLAN_FEATURE_METRICS).map(
            ([featureKey, metricKeys]) => [
                featureKey,
                [...metricKeys],
            ],
        ),
    );

    modules.forEach((moduleDefinition, moduleIndex) => {
        if (
            moduleDefinition === null
            || Array.isArray(moduleDefinition)
            || typeof moduleDefinition !== 'object'
        ) {
            throw new TypeError(
                `Capability module at index ${moduleIndex} must be an object`,
            );
        }

        const featureMetrics = moduleDefinition.featureMetrics ?? {};

        if (
            featureMetrics === null
            || Array.isArray(featureMetrics)
            || typeof featureMetrics !== 'object'
        ) {
            throw new TypeError(
                `Capability module featureMetrics at index ${moduleIndex} must be an object`,
            );
        }

        for (const [featureKey, metricKeys] of Object.entries(
            featureMetrics,
        )) {
            if (!registry.features.has(featureKey)) {
                throw new TypeError(
                    `Feature metric relation references an unknown feature: ${featureKey}`,
                );
            }

            if (!Array.isArray(metricKeys)) {
                throw new TypeError(
                    `Feature metric relation for "${featureKey}" must be an array`,
                );
            }

            if (Object.hasOwn(relations, featureKey)) {
                throw new TypeError(
                    `Duplicate feature metric relation: ${featureKey}`,
                );
            }

            const normalizedMetricKeys = [
                ...new Set(metricKeys),
            ];
            const unknownMetric = normalizedMetricKeys.find(
                (metricKey) => !registry.metrics.has(metricKey),
            );

            if (unknownMetric) {
                throw new TypeError(
                    `Feature metric relation references an unknown metric: ${unknownMetric}`,
                );
            }

            relations[featureKey] = normalizedMetricKeys;
        }
    });

    return Object.freeze(
        Object.fromEntries(
            Object.entries(relations).map(
                ([featureKey, metricKeys]) => [
                    featureKey,
                    Object.freeze([...metricKeys]),
                ],
            ),
        ),
    );
};


const ACTIVE_PLAN_FEATURE_METRIC_RELATIONS =
    composeFeatureMetricRelations({
        modules: APPLICATION_PLAN_CAPABILITY_MODULES,
        registry: ACTIVE_PLAN_CAPABILITY_REGISTRY,
    });


const getPlanFeatureMetricKeys = (
    featureKey,
    relations = ACTIVE_PLAN_FEATURE_METRIC_RELATIONS,
) => relations[featureKey] ?? Object.freeze([]);


export {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
    ACTIVE_PLAN_FEATURE_METRIC_RELATIONS,
    APPLICATION_PLAN_CAPABILITY_MODULES,
    CORE_PLAN_FEATURE_METRICS,
    composeFeatureMetricRelations,
    getPlanFeatureMetricKeys,
};
