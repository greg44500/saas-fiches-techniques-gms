import '../../setup.js';

import {
    mkdtemp,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    commitProductImport,
    inspectProductImport,
    previewProductImport,
} from '../../../modules/productCatalog/productCatalogImport.service.js';
import {
    CanonicalProduct,
} from '../../../modules/productCatalog/canonicalProduct.model.js';
import {
    WorkspaceProduct,
} from '../../../modules/productCatalog/workspaceProduct.model.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';

let ownerContext;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
});

const csvFile = (content) => ({
    originalname: 'produits.csv',
    buffer: Buffer.from(content, 'utf8'),
});

describe('M-002 product import service', () => {
    it('inspecte une source sécurisée depuis son chemin temporaire', async () => {
        const directory = await mkdtemp(
            path.join(tmpdir(), 'm002-import-'),
        );
        const filePath = path.join(directory, 'quarantine-file');

        try {
            await writeFile(
                filePath,
                'Produit;Forme\nPanais;entier',
                'utf8',
            );

            const inspected = await inspectProductImport({
                workspaceId: ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
                file: {
                    filePath,
                    originalName: 'produits.csv',
                },
            });

            expect(inspected.format).toBe('CSV');
            expect(inspected.rowCount).toBe(1);
        } finally {
            await rm(directory, {
                recursive: true,
                force: true,
            });
        }
    });

    it('prévisualise sans mutation puis crée une contribution au commit', async () => {
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit;Forme\nPanais;entier'),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0, form: 1 },
            defaults: { referenceUnit: 'KG' },
        });

        expect(preview.counts.PROPOSE_PRODUCT).toBe(1);
        expect(
            await CanonicalProduct.countDocuments({ name: 'Panais' }),
        ).toBe(0);

        const committed = await commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(committed.succeeded).toBe(1);
        expect(
            await CanonicalProduct.countDocuments({ name: 'Panais' }),
        ).toBe(1);
    });

    it('rattache une déclinaison ACTIVE existante sans doublon', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Farine',
        });
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit\nFarine'),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0 },
            defaults: { referenceUnit: 'KG' },
        });

        expect(preview.counts.ATTACH_EXISTING).toBe(1);

        await commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(
            await WorkspaceProduct.countDocuments({
                workspace: ownerContext.workspace._id,
                productVariant: reference.variant._id,
            }),
        ).toBe(1);

        const secondCommit = await commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(secondCommit.succeeded).toBe(1);
        expect(
            await WorkspaceProduct.countDocuments({
                workspace: ownerContext.workspace._id,
                productVariant: reference.variant._id,
            }),
        ).toBe(1);
    });

    it('classe comme invalide une ligne sans unité ni valeur par défaut', async () => {
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit\nPois chiche'),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0 },
        });

        expect(preview.counts.INVALID).toBe(1);
        expect(preview.rows[0].errors).toContain(
            'Unité de référence obligatoire ou invalide.',
        );
    });

    it('signale les colonnes commerciales M-003 sans les absorber', async () => {
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile(
                'Produit;Fournisseur;Référence Article;Conditionnement;Tarif HT\n'
                + 'Carotte;Sysco;CAR-001;Sac 5 kg;12,50',
            ),
        });

        expect(
            inspected.outOfScopeColumns.map(({ kind }) => kind),
        ).toEqual([
            'SUPPLIER',
            'SUPPLIER_REFERENCE',
            'PACKAGING',
            'PRICE',
        ]);
    });

    it('refuse un commit fondé sur une prévisualisation devenue obsolète', async () => {
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit\nPanais'),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0 },
            defaults: { referenceUnit: 'KG' },
        });

        expect(preview.counts.PROPOSE_PRODUCT).toBe(1);

        await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Panais',
        });

        await expect(commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        })).rejects.toMatchObject({
            statusCode: 409,
            code: 'PRODUCT_REVIEW_OUTDATED',
        });

        const refreshed = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0 },
            defaults: { referenceUnit: 'KG' },
        });

        expect(refreshed.counts.ATTACH_EXISTING).toBe(1);
    });
});
