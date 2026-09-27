import { randomUUID } from 'node:crypto';

import {
  EntitlementOverride,
} from '../../backend/modules/entitlementOverride/entitlementOverride.model.js';
import {
  createCategory,
} from '../../backend/modules/productCatalog/productCatalogGovernance.service.js';
import {
  Workspace,
} from '../../backend/modules/workspace/workspace.model.js';
import {
  provisionDossierOwnerWorkspace,
  withE2eDatabase,
} from './dossier-fixtures.js';

const PRODUCT_FEATURES = Object.freeze([
  'product_reference_access',
  'product_catalog_import',
  'product_contribution',
]);

async function enableProductFeaturesForE2eWorkspace({
  ownerId,
  workspaceId,
}) {
  const startsAt = new Date(Date.now() - 1_000);

  await EntitlementOverride.create(
    PRODUCT_FEATURES.map((featureKey) => ({
      workspace: workspaceId,
      targetType: 'feature',
      featureKey,
      featureEnabled: true,
      source: 'support',
      startsAt,
      reason: 'E2E M-002 product feature fixture',
      grantedBy: ownerId,
      updatedBy: ownerId,
    })),
  );
}

async function provisionProductOwnerWorkspace() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const workspace = await provisionDossierOwnerWorkspace({
    workspaceName: `Workspace Produits E2E ${suffix}`,
  });

  const categoryName = `Catégorie E2E ${suffix}`;

  await withE2eDatabase(async () => {
    const persistedWorkspace = await Workspace.findById(
      workspace.workspaceId,
    );

    if (!persistedWorkspace) {
      throw new Error('E2E product workspace not found');
    }

    const ownerId = persistedWorkspace.createdBy;

    await enableProductFeaturesForE2eWorkspace({
      ownerId,
      workspaceId: persistedWorkspace._id,
    });

    await createCategory({
      actorId: ownerId,
      name: categoryName,
    });
  });

  return {
    ...workspace,
    categoryName,
    productsUrl: `/workspaces/${workspace.workspaceId}/products`,
    productName: `Produit E2E ${suffix}`,
  };
}

export {
  PRODUCT_FEATURES,
  enableProductFeaturesForE2eWorkspace,
  provisionProductOwnerWorkspace,
};
