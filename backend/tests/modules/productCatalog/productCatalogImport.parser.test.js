import {
    describe,
    expect,
    it,
} from 'vitest';
import * as XLSX from '@e965/xlsx';

import {
    parseProductImportFile,
} from '../../../modules/productCatalog/productCatalogImport.parser.js';

const workbookBuffer = (bookType) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['Produit', 'Unité'],
        ['Carotte', 'kg'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produits');

    return XLSX.write(workbook, {
        bookType,
        type: 'buffer',
    });
};

describe('M-002 product import parser', () => {
    it('lit un CSV avec guillemets et séparateur point-virgule', () => {
        const parsed = parseProductImportFile({
            originalname: 'produits.csv',
            buffer: Buffer.from(
                'Produit;Alias\n"Crème fraîche";"Creme; fraîche"',
                'utf8',
            ),
        });

        expect(parsed.format).toBe('CSV');
        expect(parsed.headers).toEqual(['Produit', 'Alias']);
        expect(parsed.rows).toEqual([
            ['Crème fraîche', 'Creme; fraîche'],
        ]);
    });

    it('lit un classeur XLS', () => {
        const parsed = parseProductImportFile({
            originalname: 'produits.xls',
            buffer: workbookBuffer('biff8'),
        });

        expect(parsed.format).toBe('XLS');
        expect(parsed.rows[0]).toEqual(['Carotte', 'kg']);
    });

    it('lit un classeur XLSX', () => {
        const parsed = parseProductImportFile({
            originalname: 'produits.xlsx',
            buffer: workbookBuffer('xlsx'),
        });

        expect(parsed.format).toBe('XLSX');
        expect(parsed.headers).toEqual(['Produit', 'Unité']);
    });

    it('refuse une extension inconnue', () => {
        expect(() => parseProductImportFile({
            originalname: 'produits.pdf',
            buffer: Buffer.from('fake'),
        })).toThrow(/CSV, XLS ou XLSX/);
    });
});
