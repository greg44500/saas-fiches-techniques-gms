import '../setup.js';

import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ensureM001Indexes,
} from '../../migrations/ensureM001Indexes.migration.js';
import {
    BusinessActivityEvent,
} from '../../modules/businessActivity/businessActivity.model.js';
import {
    DossierAccessGrant,
} from '../../modules/dossier/dossierAccess.model.js';
import { Dossier } from '../../modules/dossier/dossier.model.js';


describe('M-001 index migration', () => {
    it('est idempotente et provisionne les indexes attendus', async () => {
        const first = await ensureM001Indexes();
        const second = await ensureM001Indexes();

        expect(first.totalExpected).toBe(8);
        expect(second.totalExpected).toBe(8);

        const [
            dossierIndexes,
            grantIndexes,
            activityIndexes,
        ] = await Promise.all([
            Dossier.collection.indexes(),
            DossierAccessGrant.collection.indexes(),
            BusinessActivityEvent.collection.indexes(),
        ]);

        expect(
            dossierIndexes.map(({ name }) => name),
        ).toEqual(
            expect.arrayContaining([
                'dossiers_workspace_status_updated_at',
                'dossiers_workspace_name',
                'dossiers_workspace_city',
            ]),
        );

        expect(
            grantIndexes.map(({ name }) => name),
        ).toEqual(
            expect.arrayContaining([
                'dossier_access_active_unique',
                'dossier_access_dossier_status_granted_at',
                'dossier_access_member_status',
            ]),
        );

        expect(
            activityIndexes.map(({ name }) => name),
        ).toEqual(
            expect.arrayContaining([
                'business_activity_dossier_created_at',
                'business_activity_action_created_at',
            ]),
        );
    });
});
