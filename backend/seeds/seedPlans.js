import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../constants/plan.constants.js';

import { Plan } from '../modules/plan/plan.model.js';
import { createPlan } from '../modules/plan/plan.service.js';

/**
 * Définition initiale de l'offre baseline fournie par le Core.
 *
 * Son nom commercial reste libre et modifiable. Le rôle système `baseline`
 * permet au backend de l'identifier sans dépendre du libellé visible ni d'une
 * clé saisie par un administrateur.
 */
const INITIAL_PLAN_DEFINITIONS = Object.freeze([
    Object.freeze({
        key: PLAN_KEY.FREE,
        systemRole: PLAN_SYSTEM_ROLE.BASELINE,
        name: 'Free',
        description: 'Plan gratuit de découverte.',
        status: PLAN_STATUS.ACTIVE,
        isPublic: true,
        displayOrder: 0,
        trialEnabled: false,
        trialDurationDays: null,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 0,
        priceYearlyExclTaxMinor: 0,
        features: Object.freeze([]),
        limits: Object.freeze({
            members: 1,
            storage_bytes: 100 * 1024 * 1024,
            file_uploads_monthly: 10,
            technical_sheets: 10,
        }),
    }),
]);

const seedPlans = async () => {
    const result = {
        created: [],
        skipped: [],
    };

    for (const planDefinition of INITIAL_PLAN_DEFINITIONS) {
        const existingPlan = await Plan.findOne({
            $or: [
                { systemRole: planDefinition.systemRole },
                { key: planDefinition.key },
            ],
        });

        if (existingPlan) {
            result.skipped.push(planDefinition.name);
            continue;
        }

        await createPlan({
            planData: planDefinition,
            actorId: null,
        });

        result.created.push(planDefinition.name);
    }

    return result;
};

const runSeedPlans = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const result = await seedPlans();

        console.log(`Plans créés : ${result.created.length}`);
        console.log(`Plans déjà présents : ${result.skipped.length}`);
    } finally {
        await mongoose.disconnect();
    }
};

const isExecutedDirectly =
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedPlans().catch((error) => {
        console.error(
            'Échec de la création des plans initiaux :',
            { message: error.message },
        );
        process.exitCode = 1;
    });
}

export {
    INITIAL_PLAN_DEFINITIONS,
    runSeedPlans,
    seedPlans,
};
