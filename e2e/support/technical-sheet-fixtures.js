import { randomUUID } from 'node:crypto';

import {
  EntitlementOverride,
} from '../../backend/modules/entitlementOverride/entitlementOverride.model.js';
import {
  Dossier,
} from '../../backend/modules/dossier/dossier.model.js';
import {
  createDossier,
} from '../../backend/modules/dossier/dossier.service.js';
import {
  attachVariantToWorkspace,
} from '../../backend/modules/productCatalog/productCatalog.service.js';
import {
  NEGOTIATED_PRICE_STATUS,
  SUPPLIER_SCOPE,
} from '../../backend/modules/supplierCatalog/supplierCatalog.registry.js';
import {
  NegotiatedPrice,
} from '../../backend/modules/supplierCatalog/supplierPricing.model.js';
import {
  archiveNegotiatedPrice,
  createNegotiatedPrice,
  setIndicativePrice,
} from '../../backend/modules/supplierCatalog/supplierPricing.service.js';
import {
  createSupplier,
  createSupplierArticle,
} from '../../backend/modules/supplierCatalog/supplierReference.service.js';
import {
  Workspace,
} from '../../backend/modules/workspace/workspace.model.js';
import {
  provisionSupplierOwnerWorkspace,
  provisionSupplierPricingWorkspace,
} from './supplier-fixtures.js';
import {
  withE2eDatabase,
} from './dossier-fixtures.js';

async function provisionTechnicalSheetWorkspace({
  ambiguous = false,
  exportEnabled = false,
  exportLimit = 10,
  favoriteProduct = true,
  optimizerEnabled = false,
  technicalSheetLimit = 10,
  targetMarginBasisPoints = 6000,
} = {}) {
  const context =
    await provisionSupplierPricingWorkspace();
  const suffix =
    randomUUID().replaceAll('-', '').slice(0, 8);
  let secondArticle = null;
  let secondSupplier = null;

  await withE2eDatabase(async () => {
    const workspace =
      await Workspace.findById(
        context.workspaceId,
      );

    if (!workspace) {
      throw new Error(
        'E2E M-004 workspace not found',
      );
    }

    const ownerId = workspace.createdBy;

    if (favoriteProduct) {
      await attachVariantToWorkspace({
        workspaceId: workspace._id,
        variantId: context.productVariantId,
        actorId: ownerId,
      });
    }

    await Promise.all([
      Dossier.updateOne(
        {
          _id: context.dossierA.id,
          workspace: workspace._id,
        },
        {
          $set: {
            'technicalSheetSettings.defaultTargetMarginBasisPoints':
              5000,
            updatedBy: ownerId,
          },
        },
        { runValidators: true },
      ),
      Dossier.updateOne(
        {
          _id: context.dossierB.id,
          workspace: workspace._id,
        },
        {
          $set: {
            'technicalSheetSettings.defaultTargetMarginBasisPoints':
              targetMarginBasisPoints,
            updatedBy: ownerId,
          },
        },
        { runValidators: true },
      ),
    ]);

    const startsAt = new Date(Date.now() - 1_000);

    const entitlementOverrides = [
      {
        workspace: workspace._id,
        targetType: 'feature',
        featureKey: 'product_reference_access',
        featureEnabled: true,
        source: 'support',
        startsAt,
        reason:
          'E2E M-004 product reference access fixture',
        grantedBy: ownerId,
        updatedBy: ownerId,
      },
      {
        workspace: workspace._id,
        targetType: 'limit',
        metricKey: 'technical_sheets',
        limitValue: technicalSheetLimit,
        source: 'support',
        startsAt,
        reason:
          'E2E M-004 technical sheet capacity fixture',
        grantedBy: ownerId,
        updatedBy: ownerId,
      },
    ];

    if (optimizerEnabled) {
      entitlementOverrides.push({
        workspace: workspace._id,
        targetType: 'feature',
        featureKey:
          'technical_sheet_optimizer',
        featureEnabled: true,
        source: 'support',
        startsAt,
        reason:
          'E2E M-005 optimizer feature fixture',
        grantedBy: ownerId,
        updatedBy: ownerId,
      });
    }

    if (exportEnabled) {
      entitlementOverrides.push(
        {
          workspace: workspace._id,
          targetType: 'feature',
          featureKey:
            'technical_sheet_export',
          featureEnabled: true,
          source: 'support',
          startsAt,
          reason:
            'E2E M-004 export feature fixture',
          grantedBy: ownerId,
          updatedBy: ownerId,
        },
        {
          workspace: workspace._id,
          targetType: 'limit',
          metricKey:
            'technical_sheet_exports_monthly',
          limitValue: exportLimit,
          source: 'support',
          startsAt,
          reason:
            'E2E M-004 export quota fixture',
          grantedBy: ownerId,
          updatedBy: ownerId,
        },
      );
    }

    await EntitlementOverride.create(
      entitlementOverrides,
    );

    await createNegotiatedPrice({
      workspaceId: workspace._id,
      dossierId: context.dossierA.id,
      actorId: ownerId,
      articleId: context.articleId,
      sourceAmount: '10',
      sourceBasis: 'KG',
      validFrom:
        new Date('2026-01-01T00:00:00.000Z'),
    });

    await createNegotiatedPrice({
      workspaceId: workspace._id,
      dossierId: context.dossierB.id,
      actorId: ownerId,
      articleId: context.articleId,
      sourceAmount: '20',
      sourceBasis: 'KG',
      validFrom:
        new Date('2026-01-01T00:00:00.000Z'),
    });

    if (ambiguous) {
      secondSupplier =
        await createSupplier({
          scope:
            SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
          workspaceId: workspace._id,
          actorId: ownerId,
          data: {
            name:
              'Fournisseur Ambigu M004 '
              + suffix,
          },
        });

      secondArticle =
        await createSupplierArticle({
          scope:
            SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
          workspaceId: workspace._id,
          actorId: ownerId,
          data: {
            supplierId:
              secondSupplier.id,
            productVariantId:
              context.productVariantId,
            supplierReference:
              'AMB-' + suffix,
            supplierDesignation:
              context.productReferenceName,
          },
        });

      await createNegotiatedPrice({
        workspaceId: workspace._id,
        dossierId: context.dossierA.id,
        actorId: ownerId,
        articleId: secondArticle.id,
        sourceAmount: '8',
        sourceBasis: 'KG',
        validFrom:
          new Date(
            '2026-01-01T00:00:00.000Z',
          ),
      });
    }
  });

  return {
    ...context,
    dossierATechnicalSheetsUrl:
      '/workspaces/'
      + context.workspaceId
      + '/dossiers/'
      + context.dossierA.id
      + '/technical-sheets',
    dossierBTechnicalSheetsUrl:
      '/workspaces/'
      + context.workspaceId
      + '/dossiers/'
      + context.dossierB.id
      + '/technical-sheets',
    secondArticleId:
      secondArticle?.id ?? null,
    secondArticleReference:
      secondArticle?.supplierReference ?? null,
    secondSupplierName:
      secondSupplier?.name ?? null,
    exportEnabled,
    exportLimit,
    optimizerEnabled,
    targetMarginBasisPoints,
    technicalSheetLimit,
  };
}

async function provisionGlobalPriceTechnicalSheetWorkspace() {
  const context = await provisionSupplierOwnerWorkspace({
    enableImport: false,
    withProductReference: true,
  });

  let dossier;

  await withE2eDatabase(async () => {
    const workspace = await Workspace.findById(
      context.workspaceId,
    );

    if (!workspace) {
      throw new Error(
        'E2E global price workspace not found',
      );
    }

    const ownerId = workspace.createdBy;

    dossier = await createDossier({
      workspaceId: workspace._id,
      membershipId: null,
      isOwner: true,
      actorId: ownerId,
      data: {
        name:
          'Magasin Prix repère global E2E '
          + randomUUID().replaceAll('-', '').slice(0, 8),
        defaultTargetMarginBasisPoints: 5000,
      },
    });

    const startsAt = new Date(Date.now() - 1_000);

    await EntitlementOverride.create([
      {
        workspace: workspace._id,
        targetType: 'feature',
        featureKey: 'product_reference_access',
        featureEnabled: true,
        source: 'support',
        startsAt,
        reason:
          'E2E M-004 global price product access fixture',
        grantedBy: ownerId,
        updatedBy: ownerId,
      },
      {
        workspace: workspace._id,
        targetType: 'limit',
        metricKey: 'technical_sheets',
        limitValue: 10,
        source: 'support',
        startsAt,
        reason:
          'E2E M-004 global price technical sheet fixture',
        grantedBy: ownerId,
        updatedBy: ownerId,
      },
    ]);

    await setIndicativePrice({
      workspaceId: null,
      dossierId: null,
      productVariantId: context.productVariantId,
      actorId: ownerId,
      sourceAmount: '2.5',
      sourceBasis: 'KG',
      source:
        'Référentiel de démonstration E2E',
    });
  });

  return {
    ...context,
    dossier,
    technicalSheetsUrl:
      '/workspaces/'
      + context.workspaceId
      + '/dossiers/'
      + dossier.id
      + '/technical-sheets',
  };
}

async function setWorkspaceIndicativePriceForE2e({
  workspaceId,
  productVariantId,
  sourceAmount,
}) {
  return withE2eDatabase(async () => {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new Error(
        'E2E global price workspace not found',
      );
    }

    return setIndicativePrice({
      workspaceId: workspace._id,
      dossierId: null,
      productVariantId,
      actorId: workspace.createdBy,
      sourceAmount,
      sourceBasis: 'KG',
      source: 'Estimation Workspace E2E',
    });
  });
}

async function replaceDossierNegotiatedPrice({
  articleId,
  dossierId,
  sourceAmount,
  workspaceId,
}) {
  return withE2eDatabase(async () => {
    const workspace =
      await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new Error(
        'E2E M-004 workspace not found',
      );
    }

    const active =
      await NegotiatedPrice.findOne({
        workspace: workspace._id,
        dossier: dossierId,
        supplierArticle: articleId,
        status:
          NEGOTIATED_PRICE_STATUS.ACTIVE,
      }).sort({
        validFrom: -1,
        _id: -1,
      });

    if (!active) {
      throw new Error(
        'E2E M-004 negotiated price not found',
      );
    }

    await archiveNegotiatedPrice({
      workspaceId: workspace._id,
      dossierId,
      priceId: active._id,
      actorId: workspace.createdBy,
    });

    return createNegotiatedPrice({
      workspaceId: workspace._id,
      dossierId,
      actorId: workspace.createdBy,
      articleId,
      sourceAmount,
      sourceBasis: 'KG',
      validFrom:
        new Date('2026-01-01T00:00:00.000Z'),
    });
  });
}

export {
  provisionGlobalPriceTechnicalSheetWorkspace,
  provisionTechnicalSheetWorkspace,
  replaceDossierNegotiatedPrice,
  setWorkspaceIndicativePriceForE2e,
};
