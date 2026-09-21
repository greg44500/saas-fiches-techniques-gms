import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import { Dossier } from '../../../modules/dossier/dossier.model.js';


describe('Dossier model', () => {
    it('porte explicitement son ownership Workspace', () => {
        expect(
            Dossier.schema.path('workspace').options.required,
        ).toBe(true);
        expect(
            Dossier.schema.path('workspace').options.immutable,
        ).toBe(true);
    });

    it('impose ACTIVE comme statut initial backend', () => {
        const actorId = new mongoose.Types.ObjectId();
        const dossier = new Dossier({
            workspace: new mongoose.Types.ObjectId(),
            name: 'Magasin test',
            statusChangedBy: actorId,
            createdBy: actorId,
            updatedBy: actorId,
        });

        expect(dossier.status).toBe('ACTIVE');
    });

    it('ne rend pas le nom unique dans un Workspace', () => {
        const indexes = Dossier.schema.indexes();
        const uniqueNameIndex = indexes.find(
            ([fields, options]) =>
                fields.workspace === 1
                && fields.name === 1
                && options.unique === true,
        );

        expect(uniqueNameIndex).toBeUndefined();
    });
});
