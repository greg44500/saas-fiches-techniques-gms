import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import { Plan } from '../../modules/plan/plan.model.js';

import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';
import {
    TECHNICAL_SHEET_METRIC,
} from '../../modules/technicalSheet/technicalSheet.registry.js';

import {
    createPlan,
    isBaselinePlan,
    listPublicPlans,
    validatePlanCapabilities,
} from '../../modules/plan/plan.service.js';


describe('Plan service', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });


    describe('isBaselinePlan', () => {
        it('identifie la baseline par son rôle système indépendamment de sa clé', () => {
            expect(isBaselinePlan({
                key: 'reference-technique',
                systemRole: PLAN_SYSTEM_ROLE.BASELINE,
            })).toBe(true);
        });

        it('ne considère pas un plan commercial ordinaire comme baseline', () => {
            expect(isBaselinePlan({
                key: 'premium',
                systemRole: null,
            })).toBe(false);
        });

        it('n’utilise plus la clé historique free comme autorité métier', () => {
            expect(isBaselinePlan({
                key: 'free',
                systemRole: null,
            })).toBe(false);
        });
    });


    describe('validatePlanCapabilities', () => {
        it('accepte les capabilities déclarées et toutes les limites du registre étendu', () => {
            const registry = createPlanCapabilityRegistry({
                features: ['custom_feature'],
                metrics: ['custom_metric'],
            });

            expect(() => {
                validatePlanCapabilities(
                    {
                        features: [
                            'file_upload',
                            'custom_feature',
                        ],
                        limits: {
                            members: 5,
                            storage_bytes: 1073741824,
                            file_uploads_monthly: 100,
                            custom_metric: null,
                        },
                    },
                    registry,
                );
            }).not.toThrow();
        });


        it('refuse une fonctionnalité absente du registre actif', () => {
            expect(() => {
                validatePlanCapabilities({
                    features: ['unknown_feature'],
                });
            }).toThrow(
                'Fonctionnalités de plan inconnues : unknown_feature.',
            );
        });


        it('refuse une métrique absente du registre actif', () => {
            expect(() => {
                validatePlanCapabilities({
                    limits: new Map([
                        ['unknown_metric', 10],
                    ]),
                });
            }).toThrow(
                'Métriques de plan inconnues : unknown_metric.',
            );
        });


        it('refuse une configuration de limites incomplète', () => {
            expect(() => {
                validatePlanCapabilities({
                    limits: {
                        members: 5,
                        storage_bytes: null,
                    },
                });
            }).toThrow(
                'Limites de plan non configurées : '
                + 'file_uploads_monthly, '
                + TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS
                + '.',
            );
        });
    });


    describe('createPlan', () => {
        it('crée un plan valide en attribuant les champs de traçabilité', async () => {
            const actorId = '507f1f77bcf86cd799439011';

            const planData = {
                key: 'starter',
                name: 'Starter',
                currency: 'EUR',
                priceMonthlyExclTaxMinor: 1990,
                priceYearlyExclTaxMinor: 19900,
                features: [
                    'file_upload',
                    'team_management',
                ],
                limits: {
                    members: 5,
                    storage_bytes: 1073741824,
                    file_uploads_monthly: 100,
                    [TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS]: 10,
                },
            };

            const saveSpy = vi
                .spyOn(Plan.prototype, 'save')
                .mockImplementation(async function savePlan() {
                    return this;
                });

            const result = await createPlan({
                planData,
                actorId,
            });

            expect(saveSpy).toHaveBeenCalledOnce();
            expect(result.key).toBe('starter');
            expect(result.createdBy.toString()).toBe(actorId);
            expect(result.updatedBy.toString()).toBe(actorId);
        });


        it('refuse la création d’un plan sans toutes les limites actives', async () => {
            const saveSpy = vi.spyOn(Plan.prototype, 'save');

            await expect(
                createPlan({
                    planData: {
                        key: 'incomplete-plan',
                        name: 'Incomplete plan',
                        currency: 'EUR',
                        priceMonthlyExclTaxMinor: 1000,
                        priceYearlyExclTaxMinor: 10000,
                        features: [],
                        limits: {
                            members: 1,
                        },
                    },
                }),
            ).rejects.toThrow(
                'Limites de plan non configurées : '
                + 'storage_bytes, file_uploads_monthly, '
                + TECHNICAL_SHEET_METRIC.TECHNICAL_SHEETS
                + '.',
            );

            expect(saveSpy).not.toHaveBeenCalled();
        });


        it('ne sauvegarde pas le plan lorsqu’une capability est inconnue', async () => {
            const saveSpy = vi.spyOn(Plan.prototype, 'save');

            await expect(
                createPlan({
                    planData: {
                        key: 'invalid-plan',
                        name: 'Invalid plan',
                        currency: 'EUR',
                        priceMonthlyExclTaxMinor: 1000,
                        priceYearlyExclTaxMinor: 10000,
                        features: ['unknown_feature'],
                    },
                }),
            ).rejects.toThrow(
                'Fonctionnalités de plan inconnues : unknown_feature.',
            );

            expect(saveSpy).not.toHaveBeenCalled();
        });
    });
});


describe('listPublicPlans', () => {
    it('retourne uniquement le catalogue actif et public dans l’ordre attendu', async () => {
        const publicPlans = [
            {
                systemRole: PLAN_SYSTEM_ROLE.BASELINE,
                name: 'Free',
                displayOrder: 0,
            },
            {
                systemRole: null,
                name: 'Starter',
                displayOrder: 10,
            },
        ];

        const leanMock = vi
            .fn()
            .mockResolvedValue(publicPlans);

        const sortMock = vi
            .fn()
            .mockReturnValue({
                lean: leanMock,
            });

        const selectMock = vi
            .fn()
            .mockReturnValue({
                sort: sortMock,
            });

        const findSpy = vi
            .spyOn(Plan, 'find')
            .mockReturnValue({
                select: selectMock,
            });

        const result = await listPublicPlans();

        expect(findSpy).toHaveBeenCalledWith({
            status: PLAN_STATUS.ACTIVE,
            isPublic: true,
        });

        expect(selectMock).toHaveBeenCalledWith(
            [
                'systemRole',
                'name',
                'description',
                'displayOrder',
                'trialEnabled',
                'trialDurationDays',
                'currency',
                'priceMonthlyExclTaxMinor',
                'priceYearlyExclTaxMinor',
                'features',
                'limits',
            ].join(' '),
        );

        expect(sortMock).toHaveBeenCalledWith({
            displayOrder: 1,
            name: 1,
        });

        expect(leanMock).toHaveBeenCalledOnce();
        expect(result).toBe(publicPlans);
    });
});