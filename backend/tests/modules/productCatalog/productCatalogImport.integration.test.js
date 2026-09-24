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
    createCategory,
} from '../../../modules/productCatalog/productCatalogGovernance.service.js';
import {
    commitProductImport,
    inspectProductImport,
    previewProductImport,
} from '../../../modules/productCatalog/productCatalogImport.service.js';
import {
    PRODUCT_IMPORT_SCOPE,
} from '../../../modules/productCatalog/productCatalog.registry.js';
import {
    CanonicalProduct,
} from '../../../modules/productCatalog/canonicalProduct.model.js';
import {
    ProductCharacteristic,
} from '../../../modules/productCatalog/productCharacteristic.model.js';
import {
    ProductVariant,
} from '../../../modules/productCatalog/productVariant.model.js';
import {
    ProductVariety,
} from '../../../modules/productCatalog/productVariety.model.js';
import {
    ReferenceContribution,
} from '../../../modules/productCatalog/referenceContribution.model.js';
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
let category;

beforeEach(async () => {
    ownerContext = await createWorkspaceOwnerFixture();
    category = await createCategory({
        actorId: ownerContext.owner._id,
        name: 'Import test',
    });
});

const csvFile = (content) => ({
    originalname: 'produits.csv',
    buffer: Buffer.from(content, 'utf8'),
});

const previewDefaults = () => ({
    referenceUnit: 'KG',
    conservationType: 'FRAIS',
    categoryId: category.id,
    foodRange: 1,
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
                'Produit;Présentation\nPanais;entier',
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

            expect(inspected.scope).toBe(PRODUCT_IMPORT_SCOPE.WORKSPACE);
            expect(inspected.format).toBe('CSV');
            expect(inspected.rowCount).toBe(1);
        } finally {
            await rm(directory, {
                recursive: true,
                force: true,
            });
        }
    });

    it('prévisualise sans mutation puis envoie un nouveau Produit Workspace en revue', async () => {
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit;Présentation\nPanais;entier'),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0, presentation: 1 },
            defaults: previewDefaults(),
        });

        expect(preview.counts.REVIEW_REQUIRED).toBe(1);
        expect(preview.rows[0].reviewMode).toBe('REFERENCE_GOVERNANCE');
        expect(
            await CanonicalProduct.countDocuments({ name: 'Panais' }),
        ).toBe(0);

        const committed = await commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(committed.results[0].status).toBe('PENDING_REVIEW');
        expect(
            await CanonicalProduct.countDocuments({ name: 'Panais' }),
        ).toBe(0);
        expect(
            await ReferenceContribution.countDocuments({
                workspace: ownerContext.workspace._id,
                proposedValue: 'Panais',
                status: 'PENDING_REVIEW',
            }),
        ).toBe(1);
    });

    it('rattache une référence ACTIVE existante par son nom persistant', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Farine racine',
            referenceName: 'Farine de blé',
        });
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit\nFarine de blé'),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0 },
            defaults: previewDefaults(),
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
    });

    it('reconnaît une Présentation structurée existante sans recréer la déclinaison', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Carotte import présentation',
            presentation: 'Râpée',
        });
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile(
                'Produit;Présentation\n'
                + 'Carotte import présentation;Râpée',
            ),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0, presentation: 1 },
            defaults: previewDefaults(),
        });

        expect(preview.counts.ATTACH_EXISTING).toBe(1);
        expect(preview.rows[0].variantId)
            .toBe(reference.variant._id.toString());
    });

    it('ne recrée pas une référence existante lorsque des dimensions sont importées', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Pomme import dimensions',
        });
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile(
                'Produit;Variété;Présentation\n'
                + 'Pomme import dimensions;Gala;En quartiers',
            ),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: {
                name: 0,
                variety: 1,
                presentation: 2,
            },
            defaults: previewDefaults(),
        });

        expect(preview.counts.ATTACH_EXISTING).toBe(1);
        expect(preview.rows[0].variantId)
            .toBe(reference.variant._id.toString());
        expect(preview.rows[0].warnings).toContain(
            'La référence existe déjà : les dimensions importées ne modifient pas son identité.',
        );

        await commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(
            await ProductVariant.countDocuments({
                canonicalProduct: reference.product._id,
            }),
        ).toBe(1);
        expect(
            await ProductVariety.countDocuments({
                canonicalProduct: reference.product._id,
            }),
        ).toBe(0);
    });

    it('ne crée pas de contribution dimensionnelle quand le nom de référence existe déjà', async () => {
        const reference = await createActiveProductReference({
            actorId: ownerContext.owner._id,
            name: 'Carotte import qualité',
        });
        const inspected = await inspectProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            file: csvFile(
                'Produit;Désignation qualité\n'
                + 'Carotte import qualité;Carottes des sables',
            ),
        });

        const preview = await previewProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: {
                name: 0,
                qualityDesignation: 1,
            },
            defaults: previewDefaults(),
        });

        expect(preview.counts.ATTACH_EXISTING).toBe(1);
        expect(preview.rows[0].variantId)
            .toBe(reference.variant._id.toString());

        await commitProductImport({
            workspaceId: ownerContext.workspace._id,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(
            await ReferenceContribution.countDocuments({
                canonicalProduct: reference.product._id,
            }),
        ).toBe(0);
        expect(
            await ProductVariant.countDocuments({
                canonicalProduct: reference.product._id,
            }),
        ).toBe(1);
    });

    it('alimente globalement le référentiel sans créer de rattachement Workspace', async () => {
        const inspected = await inspectProductImport({
            scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
            actorId: ownerContext.owner._id,
            file: csvFile('Produit\nPatate douce'),
        });

        const preview = await previewProductImport({
            scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
            mapping: { name: 0 },
            defaults: previewDefaults(),
        });

        expect(preview.counts.CREATE_PRODUCT).toBe(1);

        const committed = await commitProductImport({
            scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
            actorId: ownerContext.owner._id,
            importId: inspected.importId,
        });

        expect(committed.results[0].status).toBe('CREATED_PRODUCT');
        expect(
            await CanonicalProduct.countDocuments({
                name: 'Patate douce',
                status: 'ACTIVE',
            }),
        ).toBe(1);
        expect(await WorkspaceProduct.countDocuments()).toBe(0);
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
            defaults: { categoryId: category.id },
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
            defaults: previewDefaults(),
        });

        expect(preview.counts.REVIEW_REQUIRED).toBe(1);

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
            defaults: previewDefaults(),
        });

        expect(refreshed.counts.ATTACH_EXISTING).toBe(1);
    });
});
