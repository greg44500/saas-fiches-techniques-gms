import { expect, test } from '@playwright/test';

import { loginWithIdentity } from '../support/auth.js';
import {
  provisionExistingRecipientCommercialInvitation,
} from '../support/commercial-invitation-fixtures.js';
import {
  provisionDossierOwnerWorkspace,
  withE2eDatabase,
} from '../support/dossier-fixtures.js';
import {
  CommercialInvitation,
} from '../../backend/modules/commercialInvitation/commercialInvitation.model.js';
import { Plan } from '../../backend/modules/plan/plan.model.js';
import {
  Subscription,
} from '../../backend/modules/subscriptions/subscription.model.js';
import {
  WorkspaceMember,
} from '../../backend/modules/workspaceMember/workspaceMember.model.js';

const bearer = (token) => ({ Authorization: 'Bearer ' + token });

test('D-020 : mauvais bénéficiaire refusé, offre privée acceptée une fois via UI', async ({ page }) => {
  test.slow();
  const context = await provisionExistingRecipientCommercialInvitation();
  const invitationUrl = '/commercial-invitations/accept#token=' + context.token;

  // Une session Auth légitime mais appartenant à un tiers ne vaut pas
  // autorisation d'accepter l'invitation commerciale.
  const outsider = await provisionDossierOwnerWorkspace();
  const outsiderToken = await loginWithIdentity(page, outsider.identity);
  await page.goto(invitationUrl);

  await expect(page.getByRole('button', { name: 'Utiliser un autre compte' }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Accepter et créer mon espace' }))
    .toHaveCount(0);
  await expect(page).not.toHaveURL(/#token=/);

  const denied = await page.request.post('/api/commercial-invitations/accept', {
    headers: bearer(outsiderToken),
    data: { token: context.token },
  });
  expect(denied.status()).toBe(403);

  const before = await withE2eDatabase(async () => {
    const invitation = await CommercialInvitation.findById(context.invitationId);
    return {
      status: invitation.status,
      workspace: invitation.workspace,
    };
  });
  expect(before.status).toBe('pending');
  expect(before.workspace).toBeNull();

  // Le bénéficiaire correct reprend le lien original ; le token n'est
  // volontairement ni conservé dans l'URL ni dans un stockage persistant.
  const recipientToken = await loginWithIdentity(page, context.identity);
  await page.goto(invitationUrl);
  await expect(page.getByRole('heading', {
    name: 'Votre accès privé est prêt à être activé',
  })).toBeVisible();
  await expect(page.getByText(context.workspaceName)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accepter et créer mon espace' }))
    .toBeVisible();

  await page.getByRole('button', { name: 'Accepter et créer mon espace' }).click();
  await expect(page).toHaveURL(/\/workspaces\/[0-9a-f]{24}\/dashboard$/);

  const persisted = await withE2eDatabase(async () => {
    const invitation = await CommercialInvitation.findById(context.invitationId);
    const subscription = await Subscription.findById(invitation.subscription);
    const plan = await Plan.findById(context.planId);
    const memberCount = await WorkspaceMember.countDocuments({
      workspace: invitation.workspace,
      status: 'active',
    });

    return {
      invitationStatus: invitation.status,
      workspaceId: invitation.workspace.toString(),
      subscriptionWorkspace: subscription.workspace.toString(),
      subscriptionPlan: subscription.plan.toString(),
      kind: subscription.kind,
      termType: subscription.termType,
      subscriptionStatus: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodEnd: subscription.currentPeriodEnd,
      planPublic: plan.isPublic,
      memberCount,
    };
  });

  expect(page.url()).toContain('/workspaces/' + persisted.workspaceId + '/dashboard');
  expect(persisted).toMatchObject({
    invitationStatus: 'accepted',
    subscriptionWorkspace: persisted.workspaceId,
    subscriptionPlan: context.planId,
    kind: 'commercial',
    termType: 'open_ended',
    subscriptionStatus: 'active',
    billingInterval: 'none',
    currentPeriodEnd: null,
    planPublic: false,
    memberCount: 1,
  });

  // Un secret accepté ne peut plus créer un second Workspace.
  const replay = await page.request.post('/api/commercial-invitations/accept', {
    headers: bearer(recipientToken),
    data: { token: context.token },
  });
  expect(replay.status()).toBe(404);
});
