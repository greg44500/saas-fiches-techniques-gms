import '../../setup.js';

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
});
