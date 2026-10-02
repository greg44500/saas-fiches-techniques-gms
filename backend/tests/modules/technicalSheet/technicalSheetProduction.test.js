import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    editableProductionFromSnapshot,
} from '../../../modules/technicalSheet/technicalSheetProduction.service.js';

describe('technicalSheetProduction.service', () => {
    it('reprend sans transformation un snapshot conforme au modèle pièce/portion', () => {
        expect(editableProductionFromSnapshot({
            productionQuantity: '10',
            productionUnit: 'UNIT',
            portionsPerProductionUnit: '8',
            saleBasis: 'PORTION',
        })).toEqual({
            productionQuantity: '10',
            productionUnit: 'UNIT',
            portionsPerProductionUnit: '8',
            saleBasis: 'PORTION',
            requiresRemediation: false,
        });
    });

    it('ne convertit jamais implicitement une ancienne unité physique en pièce', () => {
        expect(editableProductionFromSnapshot({
            productionQuantity: '5',
            productionUnit: 'KG',
            portionsPerProductionUnit: null,
            saleBasis: null,
        })).toEqual({
            productionQuantity: '5',
            productionUnit: null,
            portionsPerProductionUnit: null,
            saleBasis: null,
            requiresRemediation: true,
        });
    });

    it('demande aussi une remédiation si le snapshot UNIT ne connaît pas encore les portions ou la base de vente', () => {
        expect(editableProductionFromSnapshot({
            productionQuantity: '80',
            productionUnit: 'UNIT',
            portionsPerProductionUnit: null,
            saleBasis: null,
        }).requiresRemediation).toBe(true);
    });
});
