import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import {
    composePlanCapabilityExtensions,
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';
import {
    PRODUCT_CATALOG_FEATURE,
} from '../../modules/productCatalog/productCatalogCapability.registry.js';


describe('Application plan capability registry', () => {
    it('conserve les capabilities Core dans le registre actif', () => {
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has('file_upload'),
        ).toBe(true);
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.metrics.has('members'),
        ).toBe(true);
    });

    it('compose les capabilities M-002 dans le registre applicatif actif', () => {
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has(
                PRODUCT_CATALOG_FEATURE.REFERENCE_ACCESS,
            ),
        ).toBe(true);
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has(
                PRODUCT_CATALOG_FEATURE.CATALOG_IMPORT,
            ),
        ).toBe(true);
        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has(
                PRODUCT_CATALOG_FEATURE.CONTRIBUTION,
            ),
        ).toBe(true);

        expect(
            ACTIVE_PLAN_CAPABILITY_REGISTRY.getFeatureDefinition(
                PRODUCT_CATALOG_FEATURE.CATALOG_IMPORT,
            ),
        ).toEqual(expect.objectContaining({
            category: 'products',
            categoryLabel: 'Produits',
        }));
    });

    it('compose des modules métier avec leurs métadonnées de présentation', () => {
        const extensions = composePlanCapabilityExtensions([
            {
                featureDefinitions: {
                    price_history: {
                        label: 'Historique des prix',
                        description: 'Consulter les évolutions de prix.',
                        category: 'products',
                        categoryLabel: 'Produits',
                        displayOrder: 20,
                        tags: ['reporting'],
                    },
                },
                metricDefinitions: {
                    products: {
                        periodType: 'current',
                        behavior: 'capacity',
                        remediationRequired: true,
                    },
                },
                metricPresentations: {
                    products: {
                        label: 'Produits',
                        category: 'products',
                        categoryLabel: 'Produits',
                        displayOrder: 10,
                        unit: 'count',
                    },
                },
            },
        ]);

        const registry = createPlanCapabilityRegistry(extensions);

        expect(registry.features.has('price_history')).toBe(true);
        expect(registry.metrics.has('products')).toBe(true);

        expect(
            registry.getFeatureDefinition('price_history'),
        ).toEqual(expect.objectContaining({
            key: 'price_history',
            label: 'Historique des prix',
            category: 'products',
            categoryLabel: 'Produits',
        }));

        expect(
            registry.getMetricPresentation('products'),
        ).toEqual(expect.objectContaining({
            key: 'products',
            label: 'Produits',
            unit: 'count',
        }));
    });

    it('fournit une présentation sûre même pour une capability déclarée sans métadonnées', () => {
        const registry = createPlanCapabilityRegistry({
            features: ['supplier_comparison'],
            metrics: ['suppliers'],
        });

        expect(
            registry.getFeatureDefinition('supplier_comparison'),
        ).toEqual(expect.objectContaining({
            key: 'supplier_comparison',
            label: 'Supplier comparison',
            category: 'other',
        }));

        expect(
            registry.getMetricPresentation('suppliers'),
        ).toEqual(expect.objectContaining({
            key: 'suppliers',
            label: 'Suppliers',
            category: 'other',
        }));
    });

    it('refuse les clés techniques invalides au moment de composer le logiciel', () => {
        expect(() => createPlanCapabilityRegistry({
            features: ['Feature Sauvage'],
        })).toThrow(TypeError);
    });

    it('refuse un module métier dont les features ne sont pas un tableau', () => {
        expect(() => composePlanCapabilityExtensions([
            {
                features: 'price_history',
            },
        ])).toThrow(
            'Capability module features must be an array',
        );
    });

    it('refuse une définition métier qui n’est pas un objet', () => {
        expect(() => createPlanCapabilityRegistry({
            featureDefinitions: {
                price_history: 'Historique des prix',
            },
        })).toThrow(
            'featureDefinitions["price_history"] must be an object',
        );
    });

    it('refuse deux modules qui déclarent la même définition métier', () => {
        expect(() => composePlanCapabilityExtensions([
            {
                featureDefinitions: {
                    ai_analysis: {
                        label: 'Analyse IA',
                    },
                },
            },
            {
                featureDefinitions: {
                    ai_analysis: {
                        label: 'Autre analyse IA',
                    },
                },
            },
        ])).toThrow(
            'Duplicate feature capability declaration: "ai_analysis"',
        );
    });

    it('retourne les catalogues triés et indépendants des Sets techniques', () => {
        const registry = createPlanCapabilityRegistry({
            featureDefinitions: {
                ai_analysis: {
                    label: 'Analyse IA',
                    category: 'ai',
                    categoryLabel: 'Intelligence artificielle',
                    displayOrder: 10,
                },
            },
        });

        const definitions = registry.listFeatureDefinitions();

        expect(definitions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'ai_analysis' }),
                expect.objectContaining({ key: 'file_upload' }),
            ]),
        );
        expect(registry.features.has('ai_analysis')).toBe(true);
    });
});