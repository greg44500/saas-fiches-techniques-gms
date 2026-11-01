import { randomUUID } from 'node:crypto';

import { registerUser } from '../../backend/modules/auth/services/registerUser.service.js';
import {
  createCommercialInvitation,
} from '../../backend/modules/commercialInvitation/commercialInvitation.service.js';
import { Plan } from '../../backend/modules/plan/plan.model.js';
import { User } from '../../backend/modules/users/user.model.js';
import { withE2eDatabase } from './dossier-fixtures.js';
import { E2E_PASSWORD } from './auth.js';
import { E2E_FOUNDER } from './environment.js';

/**
 * Crée une offre privée et une invitation D-020 réelles dans la base E2E.
 * Le bénéficiaire possède une identité Auth mais aucun Workspace : il
 * peut ainsi accepter sans réimplémenter le provisioning du Core.
 *
 * Le token brut reste en mémoire dans le processus Playwright ; seuls son
 * hash et le snapshot de l'offre sont persistés par le service existant.
 */
async function provisionExistingRecipientCommercialInvitation() {
  return withE2eDatabase(async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const identity = {
      firstName: 'Beneficiaire',
      lastName: 'E2E',
      email: 'beneficiaire.d020.' + suffix + '@example.test',
      password: E2E_PASSWORD,
    };
    await registerUser(identity);

    const founder = await User.findOne({
      emailCanonical: E2E_FOUNDER.email,
    });

    if (!founder) {
      throw new Error('Fondateur E2E absent : exécuter test:prepare');
    }

    const plan = await Plan.create({
      name: 'Accès privé E2E ' + suffix,
      description: 'Plan synthétique réservé aux tests commerciaux.',
      status: 'active',
      isPublic: false,
      systemRole: null,
      trialEnabled: false,
      trialDurationDays: null,
      currency: 'EUR',
      priceMonthlyExclTaxMinor: 0,
      priceYearlyExclTaxMinor: 0,
      features: ['team_management', 'supplier_catalog_import'],
      limits: { members: 3 },
      createdBy: founder._id,
      updatedBy: founder._id,
    });

    const workspaceName = 'Workspace privé D-020 ' + suffix;
    const { invitation, token } = await createCommercialInvitation({
      email: identity.email,
      planId: plan._id,
      workspaceName,
      billingInterval: 'none',
      reason: 'Validation non-régression PRE-BETA-002',
      actorId: founder._id,
    });

    return {
      identity,
      invitationId: invitation._id.toString(),
      planId: plan._id.toString(),
      token,
      workspaceName,
    };
  });
}

export { provisionExistingRecipientCommercialInvitation };
