import { randomUUID } from 'node:crypto';

import { createTechnicalSheet } from '../../backend/modules/technicalSheet/technicalSheet.service.js';
import { saveTechnicalSheetDraft } from '../../backend/modules/technicalSheet/technicalSheetDraft.service.js';
import { validateTechnicalSheet } from '../../backend/modules/technicalSheet/technicalSheetValidation.service.js';
import { Workspace } from '../../backend/modules/workspace/workspace.model.js';
import { withE2eDatabase } from './dossier-fixtures.js';
import { provisionTechnicalSheetWorkspace } from './technical-sheet-fixtures.js';

/**
 * Prépare une vraie validation M-004 dans la base _e2e_test.
 * Les scénarios M-006 peuvent ainsi tester leur propre interface, sans refaire
 * le parcours d'édition M-004 déjà couvert par technical-sheets-m004.spec.js.
 */
async function provisionValidatedProcessParent() {
  const context = await provisionTechnicalSheetWorkspace();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const technicalSheetName = 'Fiche source process E2E ' + suffix;

  const technicalSheetId = await withE2eDatabase(async () => {
    const workspace = await Workspace.findById(context.workspaceId);
    if (!workspace) throw new Error('Workspace E2E M-006 introuvable');

    const scope = {
      workspaceId: context.workspaceId,
      dossierId: context.dossierA.id,
      actorId: workspace.createdBy,
    };
    const created = await createTechnicalSheet({
      ...scope,
      data: {
        name: technicalSheetName,
        productionQuantity: '10',
        productionUnit: 'UNIT',
        vatRateBasisPoints: 1000,
      },
    });
    const saved = await saveTechnicalSheetDraft({
      ...scope,
      technicalSheetId: created.sheet.id,
      expectedRevision: created.draft.revision,
      canManageSourcing: true,
      canManageValuation: true,
      data: {
        productionQuantity: '10',
        productionUnit: 'UNIT',
        vatRateBasisPoints: 1000,
        targetMarginBasisPoints: 5000,
        finalPriceMode: 'ADVISED',
        lines: [{
          kind: 'INGREDIENT',
          productVariantId: context.productVariantId,
          netQuantity: '2',
          inputUnit: 'KG',
          order: 0,
        }],
      },
    });
    await validateTechnicalSheet({
      ...scope,
      technicalSheetId: created.sheet.id,
      expectedSheetRevision: created.sheet.revision,
      expectedDraftRevision: saved.revision,
      atDate: new Date('2026-10-26T12:00:00.000Z'),
    });
    return created.sheet.id;
  });

  return {
    ...context,
    technicalSheetId,
    technicalSheetName,
    processSheetsUrl: '/workspaces/' + context.workspaceId
      + '/dossiers/' + context.dossierA.id + '/process-sheets',
  };
}

export { provisionValidatedProcessParent };
