import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    getPlanFeatureOverridePolicy,
    getPlanMetricOverridePolicy,
    isLimitValueAllowedByOverridePolicy,
} from '../../../config/entitlementOverridePolicy.registry.js';


describe('entitlementOverridePolicy.registry', () => {
    it('borne la dérogation members sans modifier la limite du Plan', () => {
        expect(getPlanMetricOverridePolicy('members')).toMatchObject({
            control: 'linear_slider',
            min: 0,
            max: 50,
            step: 1,
            allowUnlimited: false,
        });

        expect(isLimitValueAllowedByOverridePolicy({
            metricKey: 'members',
            limitValue: 50,
        })).toBe(true);
        expect(isLimitValueAllowedByOverridePolicy({
            metricKey: 'members',
            limitValue: 51,
        })).toBe(false);
        expect(isLimitValueAllowedByOverridePolicy({
            metricKey: 'members',
            limitValue: null,
        })).toBe(false);
    });

    it('n’autorise pour le stockage que les paliers commerciaux connus', () => {
        const policy = getPlanMetricOverridePolicy('storage_bytes');

        expect(policy.control).toBe('preset_slider');
        expect(policy.values).toContain(10 * 1024 * 1024 * 1024);
        expect(isLimitValueAllowedByOverridePolicy({
            metricKey: 'storage_bytes',
            limitValue: 5 * 1024 * 1024 * 1024,
        })).toBe(true);
        expect(isLimitValueAllowedByOverridePolicy({
            metricKey: 'storage_bytes',
            limitValue: 5 * 1024 * 1024 * 1024 + 1,
        })).toBe(false);
    });

    it('borne le quota mensuel des exports et leur dérogation commerciale', () => {
        expect(
            getPlanMetricOverridePolicy(
                'technical_sheet_exports_monthly',
            ),
        ).toEqual({
            control: 'preset_slider',
            values: [
                0,
                10,
                25,
                50,
                100,
                250,
                500,
            ],
            allowUnlimited: false,
        });

        expect(
            getPlanFeatureOverridePolicy(
                'technical_sheet_export',
            ),
        ).toEqual({
            requiredLimits: {
                technical_sheet_exports_monthly: {
                    minimumEffectiveValue: 1,
                    minimumHeadroom: 1,
                },
            },
        });

        expect(
            isLimitValueAllowedByOverridePolicy({
                metricKey:
                    'technical_sheet_exports_monthly',
                limitValue: 10,
            }),
        ).toBe(true);
        expect(
            isLimitValueAllowedByOverridePolicy({
                metricKey:
                    'technical_sheet_exports_monthly',
                limitValue: 11,
            }),
        ).toBe(false);
    });

    it('déclare le minimum et la capacité disponible de la gestion d’équipe', () => {
        expect(getPlanFeatureOverridePolicy('team_management'))
            .toEqual({
                requiredLimits: {
                    members: {
                        minimumEffectiveValue: 2,
                        minimumHeadroom: 1,
                    },
                },
            });
    });
});
