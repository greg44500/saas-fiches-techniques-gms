import {
    describe,
    expect,
    it,
} from 'vitest';
import * as XLSX from '@e965/xlsx';

import {
    buildTechnicalSheetExportProjection,
} from '../../../modules/technicalSheet/technicalSheetExportProjection.service.js';
import {
    buildTechnicalSheetPdf,
    buildTechnicalSheetPdfLayout,
} from '../../../modules/technicalSheet/technicalSheetExportPdf.service.js';
import {
    buildTechnicalSheetCsv,
    buildTechnicalSheetXlsx,
    neutralizeSpreadsheetText,
} from '../../../modules/technicalSheet/technicalSheetExportSpreadsheet.service.js';

const validation = {
    id: 'validation-1',
    technicalSheetId:
        'technical-sheet-1',
    validatedAt:
        new Date(
            '2026-10-06T10:00:00.000Z',
        ),
    sheetSnapshot: {
        name:
            '=Fiche test',
        description:
            '@Description test',
        productionQuantity:
            '10',
        productionUnit:
            'UNIT',
        portionsPerProductionUnit:
            '8',
        saleBasis:
            'PORTION',
        vatRateBasisPoints:
            1000,
        targetMarginBasisPoints:
            5000,
    },
    linesSnapshot: [
        {
            kind: 'INGREDIENT',
            productVariantId:
                'variant-1',
            productVariantName:
                '+Carotte',
            netQuantity:
                '2',
            inputUnit:
                'KG',
            yieldPercentUsed:
                '80',
            grossQuantity:
                '2.5',
            grossUnit:
                'KG',
            normalizedPriceHt:
                '3.25',
            normalizedUnit:
                'KG',
            lineCostHt:
                '8.125',
            order: 0,
        },
        {
            kind: 'ECONOMAT',
            productVariantId:
                'variant-2',
            productVariantName:
                'Barquette',
            countUnitLabelSingular:
                'barquette',
            countUnitLabelPlural:
                'barquettes',
            netQuantity:
                '1',
            inputUnit:
                'UNIT',
            yieldPercentUsed:
                '100',
            grossQuantity:
                '1',
            grossUnit:
                'UNIT',
            normalizedPriceHt:
                '0.5',
            normalizedUnit:
                'UNIT',
            lineCostHt:
                '0.5',
            order: 1,
            note:
                'Servir à part',
        },
    ],
    economicSnapshot: {
        materialCostHt:
            '8.125',
        economatCostHt:
            '0.5',
        manufacturingCostHt:
            '8.625',
        materialCostPerProductionUnitHt:
            '0.8125',
        economatCostPerProductionUnitHt:
            '0.05',
        manufacturingCostPerProductionUnitHt:
            '0.8625',
        totalPortions:
            '80',
        materialCostPerPortionHt:
            '0.1015625',
        economatCostPerPortionHt:
            '0.00625',
        manufacturingCostPerPortionHt:
            '0.1078125',
        advisedPriceTtcMinor:
            25,
        finalPriceTtcMinor:
            30,
        actualMarginBasisPoints:
            3500,
        targetMarginDeltaBasisPoints:
            -1500,
        targetMarginDeltaAmountHt:
            '-0.1',
        targetMarginDeltaProductionHt:
            '-8',
    },
};

describe('M-004 exports de Fiches techniques', () => {
    it('projette uniquement les données métier exportables', () => {
        const projection =
            buildTechnicalSheetExportProjection({
                validation,
            });

        expect(
            projection.sections.ingredients,
        ).toHaveLength(1);
        expect(
            projection.sections.economat[0],
        ).toMatchObject({
            productName: 'Barquette',
            netUnitLabel:
                'barquette',
            normalizedUnitLabel:
                'barquette',
        });
        expect(
            projection.analysis,
        ).not.toHaveProperty(
            'targetMarginDeltaBasisPoints',
        );
        expect(
            projection.analysis,
        ).not.toHaveProperty(
            'targetMarginDeltaAmountHt',
        );
    });

    it('neutralise les textes interprétables comme formules tableur', () => {
        expect(
            neutralizeSpreadsheetText(
                '=1+1',
            ),
        ).toBe("'=1+1");
        expect(
            neutralizeSpreadsheetText(
                '+Produit',
            ),
        ).toBe("'+Produit");
        expect(
            neutralizeSpreadsheetText(
                'Produit',
            ),
        ).toBe('Produit');
        expect(
            neutralizeSpreadsheetText(
                -12,
            ),
        ).toBe(-12);
    });

    it('génère un CSV UTF-8 avec BOM et sans les écarts d’analyse', () => {
        const projection =
            buildTechnicalSheetExportProjection({
                validation,
            });
        const buffer =
            buildTechnicalSheetCsv(
                projection,
            );
        const text =
            buffer.toString('utf8');

        expect(
            buffer.subarray(0, 3),
        ).toEqual(
            Buffer.from([
                0xEF,
                0xBB,
                0xBF,
            ]),
        );
        expect(text)
            .toContain(
                "'=Fiche test",
            );
        expect(text)
            .toContain(
                "'+Carotte",
            );
        expect(text)
            .not.toContain(
                'Écart vs cible',
            );
        expect(text)
            .not.toContain(
                'Rendement (%)',
            );
        expect(text)
            .not.toContain(
                'Quantité brute',
            );
        expect(text)
            .not.toContain(
                '"Section"',
            );
        expect(text)
            .toContain(
                '"Note"',
            );
        expect(text)
            .toContain(
                '"Servir à part"',
            );
    });

    it('génère un classeur XLSX structuré en trois feuilles', () => {
        const projection =
            buildTechnicalSheetExportProjection({
                validation,
            });
        const buffer =
            buildTechnicalSheetXlsx(
                projection,
            );
        const workbook =
            XLSX.read(buffer, {
                type: 'buffer',
            });

        expect(
            workbook.SheetNames,
        ).toEqual([
            'Fiche',
            'Composition',
            'Analyse',
        ]);
        expect(
            workbook.Sheets.Fiche.B1.v,
        ).toBe("'=Fiche test");
        expect(
            workbook.Sheets.Composition.A2.v,
        ).toBe("'+Carotte");
        expect(
            workbook.Sheets.Composition.G3.v,
        ).toBe('Servir à part');
        expect(
            workbook.Sheets.Composition.A1.v,
        ).toBe('Produit');
        expect(
            workbook.Sheets.Composition.B1.v,
        ).toBe('Quantité');
        expect(
            workbook.Sheets.Composition.C1.v,
        ).toBe('Unité');
    });

    it('aligne le contrat de présentation PDF sur la prévisualisation officielle', () => {
        const projection =
            buildTechnicalSheetExportProjection({
                validation,
            });
        const layout =
            buildTechnicalSheetPdfLayout(
                projection,
            );

        expect(
            layout.document,
        ).toEqual({
            orientation: 'landscape',
            pageSize: 'A4',
        });
        expect(
            layout.productionCards
                .map(({ label }) => label),
        ).toEqual([
            'Quantité produite',
            'Portions / pièce',
            'Total portions',
        ]);
        expect(
            layout.compositionColumns
                .reduce(
                    (total, { width }) =>
                        total + width,
                    0,
                ),
        ).toBe(770);
        expect(
            layout.compositionColumns
                .map(({ label }) => label),
        ).toEqual([
            'Produit',
            'Quantité',
            'Prix HT',
            'Coût HT',
            'Note',
        ]);
        expect(
            layout.compositionRows,
        ).toEqual([
            expect.objectContaining({
                product:
                    '+Carotte',
                quantity: '2 kg',
                price:
                    '3,25 € / kg',
                cost: '8,13 €',
                note: '',
            }),
            expect.objectContaining({
                product:
                    'Barquette',
                quantity:
                    '1 barquette',
                note:
                    'Servir à part',
            }),
        ]);
        expect(
            layout.analysisCards
                .map(({ label }) => label),
        ).toEqual([
            'Coût matière HT',
            'Coût Économat HT',
            'Coût de fabrication HT',
            'Prix conseillé TTC',
            'Prix retenu TTC',
            'Marge réelle',
        ]);
        expect(
            layout.analysisDetails
                .some(
                    ({ label }) =>
                        label.includes('Écart'),
                ),
        ).toBe(false);
    });

    it('n’affiche la colonne Note que lorsqu’une note existe réellement', () => {
        const withoutNotes =
            buildTechnicalSheetExportProjection({
                validation: {
                    ...validation,
                    linesSnapshot:
                        validation.linesSnapshot
                            .map((line) => ({
                                ...line,
                                note: null,
                            })),
                },
            });
        const layout =
            buildTechnicalSheetPdfLayout(
                withoutNotes,
            );

        expect(
            layout.compositionColumns
                .map(({ label }) => label),
        ).toEqual([
            'Produit',
            'Quantité',
            'Prix HT',
            'Coût HT',
        ]);
        expect(
            layout.compositionRows
                .every(
                    (line) =>
                        !Object.hasOwn(
                            line,
                            'note',
                        ),
                ),
        ).toBe(true);
    });

    it('pagine une composition longue en conservant un PDF A4 paysage valide', () => {
        const projection =
            buildTechnicalSheetExportProjection({
                validation: {
                    ...validation,
                    linesSnapshot:
                        Array.from(
                            { length: 45 },
                            (_, index) => ({
                                ...validation
                                    .linesSnapshot[0],
                                productVariantId:
                                    'variant-'
                                    + index,
                                productVariantName:
                                    'Produit avec une désignation métier suffisamment longue '
                                    + index,
                                order: index,
                            }),
                        ),
                },
            });
        const buffer =
            buildTechnicalSheetPdf(
                projection,
            );
        const content =
            buffer.toString(
                'latin1',
            );

        expect(content)
            .toContain(
                '/MediaBox [0 0 842 595]',
            );
        expect(
            (
                content.match(
                    /\/Type \/Page\b/g,
                )
                ?? []
            ).length,
        ).toBeGreaterThan(1);
    });

    it('génère un document PDF téléchargeable', () => {
        const projection =
            buildTechnicalSheetExportProjection({
                validation,
            });
        const buffer =
            buildTechnicalSheetPdf(
                projection,
            );

        expect(
            buffer.toString(
                'latin1',
                0,
                8,
            ),
        ).toBe('%PDF-1.4');
        expect(
            buffer.toString('latin1'),
        ).toContain('%%EOF');
    });
});
