import '../../setup.js';
import '../../../config/applicationCapability.registry.js';

import { beforeEach, describe, expect, it } from 'vitest';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import { TechnicalSheet } from '../../../modules/technicalSheet/technicalSheet.model.js';
import { TechnicalSheetRange } from '../../../modules/technicalSheet/technicalSheetRange.model.js';
import {
    assignTechnicalSheetRange,
    createRange,
    deleteRange,
} from '../../../modules/technicalSheet/technicalSheetRange.service.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let owner;
let dossier;

beforeEach(async () => {
    owner = await createWorkspaceOwnerFixture();
    dossier = await Dossier.create({
        workspace: owner.workspace._id,
        name: 'Atelier Gammes concurrence',
        technicalSheetSettings: { defaultTargetMarginBasisPoints: 4500 },
        statusChangedBy: owner.owner._id,
        createdBy: owner.owner._id,
        updatedBy: owner.owner._id,
    });
});

describe('M-004 Gammes — protections transactionnelles', () => {
    it('ne laisse jamais de Fiche orpheline lors de la suppression concurrente', async () => {
        const range = await createRange({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            name: 'Atelier',
        });
        const { sheet } = await createTechnicalSheet({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            actorId: owner.owner._id,
            data: {
                name: 'Fiche concurrence',
                productionQuantity: '10',
                productionUnit: 'UNIT',
                vatRateBasisPoints: 550,
            },
        });

        const [remove, assign] = await Promise.allSettled([
            deleteRange({
                workspaceId: owner.workspace._id,
                rangeId: range.id,
                actorId: owner.owner._id,
                expectedRevision: range.revision,
            }),
            assignTechnicalSheetRange({
                workspaceId: owner.workspace._id,
                dossierId: dossier._id,
                technicalSheetId: sheet.id,
                actorId: owner.owner._id,
                expectedRevision: sheet.revision,
                rangeId: range.id,
            }),
        ]);

        const persistedRange = await TechnicalSheetRange.findById(range.id);
        const persistedSheet = await TechnicalSheet.findById(sheet.id);
        expect(!(persistedSheet.range && !persistedRange)).toBe(true);
        expect([remove, assign].filter((result) => result.status === 'fulfilled'))
            .toHaveLength(1);
    });
});
