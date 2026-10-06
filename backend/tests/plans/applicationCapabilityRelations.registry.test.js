import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    composeFeatureMetricRelations,
    getPlanFeatureMetricKeys,
} from '../../config/applicationCapability.registry.js';
import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';
import {
    TECHNICAL_SHEET_FEATURE,
    TECHNICAL_SHEET_METRIC,
} from '../../modules/technicalSheet/technicalSheet.registry.js';


describe('application feature metric relations', () => {
    it('conserve les relations Core entre features et métriques', () => {
        expect(getPlanFeatureMetricKeys('file_upload')).toEqual(
            expect.arrayContaining([
                'storage_bytes',
                'file_uploads_monthly',
            ]),
        );

        expect(getPlanFeatureMetricKeys('team_management')).toEqual([
            'members',
        ]);
    });

    it('relie l’export de Fiches à son quota mensuel partagé', () => {
        expect(
            getPlanFeatureMetricKeys(
                TECHNICAL_SHEET_FEATURE.EXPORT,
            ),
        ).toEqual([
            TECHNICAL_SHEET_METRIC.EXPORTS_MONTHLY,
        ]);
    });

    it('compose explicitement la relation d’une capability métier', () => {
        const registry = createPlanCapabilityRegistry({
            features: ['price_history'],
            metrics: ['price_history_entries_monthly'],
        });

        const relations = composeFeatureMetricRelations({
            modules: [
                {
                    featureMetrics: {
                        price_history: [
                            'price_history_entries_monthly',
                        ],
                    },
                },
            ],
            registry,
        });

        expect(relations.price_history).toEqual([
            'price_history_entries_monthly',
        ]);
    });

    it('refuse une relation vers une métrique inconnue', () => {
        const registry = createPlanCapabilityRegistry({
            features: ['price_history'],
        });

        expect(() => composeFeatureMetricRelations({
            modules: [
                {
                    featureMetrics: {
                        price_history: ['unknown_metric'],
                    },
                },
            ],
            registry,
        })).toThrow(
            'Feature metric relation references an unknown metric: unknown_metric',
        );
    });

    it('refuse une relation déclarée pour une feature inconnue', () => {
        const registry = createPlanCapabilityRegistry();

        expect(() => composeFeatureMetricRelations({
            modules: [
                {
                    featureMetrics: {
                        unknown_feature: [],
                    },
                },
            ],
            registry,
        })).toThrow(
            'Feature metric relation references an unknown feature: unknown_feature',
        );
    });
});
