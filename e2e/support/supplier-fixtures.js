import { randomUUID } from 'node:crypto';

import {
  EntitlementOverride,
} from '../../backend/modules/entitlementOverride/entitlementOverride.model.js';
import {
  createDossier,
} from '../../backend/modules/dossier/dossier.service.js';
import {
  createGlobalProduct,
} from '../../backend/modules/productCatalog/productCatalogGovernance.service.js';
import {
  createCatalogEdition,
  upsertCatalogLine,
} from '../../backend/modules/supplierCatalog/supplierCatalog.service.js';
import {
  SUPPLIER_SCOPE,
} from '../../backend/modules/supplierCatalog/supplierCatalog.registry.js';
import {
  createSupplier,
  createSupplierArticle,
} from '../../backend/modules/supplierCatalog/supplierReference.service.js';
import {
  Workspace,
} from '../../backend/modules/workspace/workspace.model.js';
import {
  provisionDossierOwnerWorkspace,
  withE2eDatabase,
} from './dossier-fixtures.js';

const SUPPLIER_IMPORT_FEATURE = 'supplier_catalog_import';

async function enableSupplierImportForE2eWorkspace({
  ownerId,
  workspaceId,
}) {
  await EntitlementOverride.create({
    workspace: workspaceId,
    targetType: 'feature',
    featureKey: SUPPLIER_IMPORT_FEATURE,
    featureEnabled: true,
    source: 'support',
    startsAt: new Date(Date.now() - 1_000),
    reason: 'E2E M-003 supplier catalog import fixture',
    grantedBy: ownerId,
    updatedBy: ownerId,
  });
}

async function createProductReference({
  actorId,
  name,
}) {
  return createGlobalProduct({
    actorId,
    name,
    aliases: [],
    categoryId: null,
    reviewedCandidateIds: [],
    variant: {
      name,
      conservationType: 'FRAIS',
      foodRange: 1,
      processingState: 'Produit frais',
      referenceUnit: 'KG',
    },
  });
}

async function provisionSupplierOwnerWorkspace({
  enableImport = true,
  withProductReference = true,
  workspaceName,
} = {}) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const workspace = await provisionDossierOwnerWorkspace({
    workspaceName:
      workspaceName
      ?? 'Workspace Fournisseurs E2E ' + suffix,
  });

  let productReference = null;

  await withE2eDatabase(async () => {
    const persistedWorkspace = await Workspace.findById(
      workspace.workspaceId,
    );

    if (!persistedWorkspace) {
      throw new Error('E2E supplier workspace not found');
    }

    const ownerId = persistedWorkspace.createdBy;

    if (enableImport) {
      await enableSupplierImportForE2eWorkspace({
        ownerId,
        workspaceId: persistedWorkspace._id,
      });
    }

    if (withProductReference) {
      const name = 'Produit Fournisseur E2E ' + suffix;
      productReference = await createProductReference({
        actorId: ownerId,
        name,
      });
    }
  });

  return {
    ...workspace,
    productsUrl:
      '/workspaces/' + workspace.workspaceId + '/products',
    suppliersUrl:
      '/workspaces/' + workspace.workspaceId + '/suppliers',
    productReferenceName:
      productReference?.variant?.name ?? null,
    productVariantId:
      productReference?.variant?.id ?? null,
  };
}

async function provisionSupplierPricingWorkspace() {
  const context = await provisionSupplierOwnerWorkspace({
    enableImport: false,
    withProductReference: true,
  });

  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  let result;

  await withE2eDatabase(async () => {
    const workspace = await Workspace.findById(
      context.workspaceId,
    );

    if (!workspace) {
      throw new Error('E2E pricing workspace not found');
    }

    const ownerId = workspace.createdBy;
    const supplier = await createSupplier({
      scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
      workspaceId: workspace._id,
      actorId: ownerId,
      data: {
        name: 'Fournisseur Prix E2E ' + suffix,
      },
    });

    const article = await createSupplierArticle({
      scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
      workspaceId: workspace._id,
      actorId: ownerId,
      data: {
        supplierId: supplier.id,
        productVariantId: context.productVariantId,
        supplierReference: 'PRICE-' + suffix,
        supplierDesignation: context.productReferenceName,
        packaging: {
          unitCount: 1,
          quantityPerUnit: '10',
          unit: 'KG',
        },
      },
    });

    const dossierA = await createDossier({
      workspaceId: workspace._id,
      membershipId: null,
      isOwner: true,
      actorId: ownerId,
      data: {
        name: 'Magasin Prix A ' + suffix,
      },
    });

    const dossierB = await createDossier({
      workspaceId: workspace._id,
      membershipId: null,
      isOwner: true,
      actorId: ownerId,
      data: {
        name: 'Magasin Prix B ' + suffix,
      },
    });

    result = {
      supplier,
      article,
      dossierA,
      dossierB,
    };
  });

  return {
    ...context,
    supplierName: result.supplier.name,
    articleReference: result.article.supplierReference,
    articleId: result.article.id,
    dossierA: result.dossierA,
    dossierB: result.dossierB,
    dossierAPricingUrl:
      '/workspaces/'
      + context.workspaceId
      + '/dossiers/'
      + result.dossierA.id
      + '/suppliers',
    dossierBPricingUrl:
      '/workspaces/'
      + context.workspaceId
      + '/dossiers/'
      + result.dossierB.id
      + '/suppliers',
  };
}

async function provisionGlobalCatalogAcrossWorkspaces() {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const workspaceA = await provisionDossierOwnerWorkspace({
    workspaceName: 'Workspace Global A ' + suffix,
  });
  const workspaceB = await provisionDossierOwnerWorkspace({
    workspaceName: 'Workspace Global B ' + suffix,
  });

  const catalogName = 'Catalogue Global E2E ' + suffix;
  const supplierName = 'Fournisseur Global E2E ' + suffix;

  await withE2eDatabase(async () => {
    const persistedA = await Workspace.findById(
      workspaceA.workspaceId,
    );

    if (!persistedA) {
      throw new Error('E2E global catalog workspace not found');
    }

    const ownerId = persistedA.createdBy;
    const productReference = await createProductReference({
      actorId: ownerId,
      name: 'Produit Global Catalogue E2E ' + suffix,
    });
    const supplier = await createSupplier({
      scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
      actorId: ownerId,
      data: {
        name: supplierName,
      },
    });
    const article = await createSupplierArticle({
      scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
      actorId: ownerId,
      data: {
        supplierId: supplier.id,
        productVariantId: productReference.variant.id,
        supplierReference: 'GLOBAL-' + suffix,
        supplierDesignation: productReference.variant.name,
      },
    });
    const catalog = await createCatalogEdition({
      scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
      actorId: ownerId,
      supplierId: supplier.id,
      data: {
        name: catalogName,
        editionDate: new Date('2026-09-01T00:00:00.000Z'),
        validFrom: new Date('2026-09-01T00:00:00.000Z'),
      },
    });

    await upsertCatalogLine({
      scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
      catalogId: catalog.catalog.id,
      actorId: ownerId,
      row: {
        supplierReference: article.supplierReference,
        designation: productReference.variant.name,
        supplierArticleId: article.id,
        sourcePrice: {
          amount: '12',
          basis: 'KG',
          currency: 'EUR',
        },
      },
    });
  });

  return {
    catalogName,
    supplierName,
    workspaceA: {
      ...workspaceA,
      suppliersUrl:
        '/workspaces/' + workspaceA.workspaceId + '/suppliers',
    },
    workspaceB: {
      ...workspaceB,
      suppliersUrl:
        '/workspaces/' + workspaceB.workspaceId + '/suppliers',
    },
  };
}

export {
  SUPPLIER_IMPORT_FEATURE,
  enableSupplierImportForE2eWorkspace,
  provisionGlobalCatalogAcrossWorkspaces,
  provisionSupplierOwnerWorkspace,
  provisionSupplierPricingWorkspace,
};
