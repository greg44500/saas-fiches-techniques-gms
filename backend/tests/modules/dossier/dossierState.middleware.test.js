import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    DOSSIER_STATE_POLICY,
    enforceDossierStatePolicy,
} from '../../../modules/dossier/dossierState.middleware.js';


const runPolicy = ({
    policy,
    status,
    permissions = [],
}) => {
    const next = vi.fn();

    enforceDossierStatePolicy(policy)(
        {
            dossier: {
                status,
            },
            permissions,
        },
        {},
        next,
    );

    return next;
};


describe('dossier state policy middleware', () => {
    it('autorise la lecture historique ARCHIVED', () => {
        const next = runPolicy({
            policy: DOSSIER_STATE_POLICY.READ,
            status: 'ARCHIVED',
        });

        expect(next).toHaveBeenCalledWith();
    });

    it('refuse une modification générale sur ARCHIVED', () => {
        const next = runPolicy({
            policy: DOSSIER_STATE_POLICY.UPDATE,
            status: 'ARCHIVED',
        });

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 409,
            }),
        );
    });

    it('réserve la lecture DELETED à l autorité lifecycle', () => {
        const denied = runPolicy({
            policy: DOSSIER_STATE_POLICY.READ,
            status: 'DELETED',
            permissions: [
                'dossier:read',
            ],
        });

        expect(denied).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 404,
            }),
        );

        const allowed = runPolicy({
            policy: DOSSIER_STATE_POLICY.READ,
            status: 'DELETED',
            permissions: [
                'dossier:read',
                'dossier:lifecycle:update',
            ],
        });

        expect(allowed).toHaveBeenCalledWith();
    });
});
