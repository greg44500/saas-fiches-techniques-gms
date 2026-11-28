import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findModelFiles, describeModels } from './model-inventory.mjs';

test('inventorie les fichiers modèles imbriqués sans exécuter leur contenu', async () => {
    const root = await mkdtemp(join(tmpdir(), 'fichepilot-models-'));
    try {
        await mkdir(join(root, 'domain'));
        await writeFile(join(root, 'domain', 'item.model.js'), 'throw Error("never import")');
        await writeFile(join(root, 'item.service.js'), '');
        assert.deepEqual(await findModelFiles(root), [join(root, 'domain', 'item.model.js')]);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test('conserve les clés ordonnées et contraintes d’index sans appeler MongoDB', () => {
    const model = {
        modelName: 'Sample',
        collection: { name: 'samples' },
        schema: { indexes: () => [[{ workspace: 1, key: -1 }, {
            unique: true, partialFilterExpression: { active: true }, background: true,
        }], [{ expireAt: 1 }, { expireAfterSeconds: 0 }]] },
    };
    assert.deepEqual(describeModels({ Sample: model }), [{
        model: 'Sample', collection: 'samples', indexes: [
            { key: { workspace: 1, key: -1 }, options: {
                unique: true, partialFilterExpression: { active: true },
            } },
            { key: { expireAt: 1 }, options: { expireAfterSeconds: 0 } },
        ],
    }]);
});
