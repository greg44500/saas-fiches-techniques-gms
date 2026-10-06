import '../setup.js';
import '../../config/applicationCapability.registry.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import {
    addM004TechnicalSheetExportPlanLimit,
} from '../../migrations/addM004TechnicalSheetExportPlanLimit.migration.js';
import { Plan } from '../../modules/plan/plan.model.js';
import {
    TECHNICAL_SHEET_METRIC,
} from '../../modules/technicalSheet/technicalSheet.registry.js';

describe('migration M-004 quota exports', () => {
    beforeEach(async () => {
        await Plan.deleteMany({});
    });

    it('ajoute 10 exports mensuels sans activer la feature commerciale', async () => {
        await Plan.create({
            key: 'free-export-migration',
            systemRole:
                PLAN_SYSTEM_ROLE.BASELINE,
            name: 'Free export migration',
            description: 'Test',
            status: PLAN_STATUS.ACTIVE,
            isPublic: true,
            displayOrder: 0,
            trialEnabled: false,
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 0,
            priceYearlyExclTaxMinor: 0,
            features: [],
            limits: {
                technical_sheets: 10,
            },
        });

        await addM004TechnicalSheetExportPlanLimit();

        const plan = await Plan.findOne({
            key: 'free-export-migration',
        });

        expect(
            plan.features,
        ).not.toContain(
            'technical_sheet_export',
        );
        expect(
            plan.limits.get(
                TECHNICAL_SHEET_METRIC
                    .EXPORTS_MONTHLY,
            ),
        ).toBe(10);
    });

    it('préserve une limite déjà configurée', async () => {
        await Plan.create({
            key: 'premium-export-migration',
            name: 'Premium export migration',
            description: 'Test',
            status: PLAN_STATUS.ACTIVE,
            isPublic: true,
            displayOrder: 1,
            trialEnabled: false,
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 1000,
            priceYearlyExclTaxMinor: 10000,
            features: [],
            limits: {
                technical_sheets: 100,
                [TECHNICAL_SHEET_METRIC
                    .EXPORTS_MONTHLY]: 50,
            },
        });

        await addM004TechnicalSheetExportPlanLimit();

        const plan = await Plan.findOne({
            key: 'premium-export-migration',
        });

        expect(
            plan.limits.get(
                TECHNICAL_SHEET_METRIC
                    .EXPORTS_MONTHLY,
            ),
        ).toBe(50);
    });
});
