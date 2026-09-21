import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    APPLICATION_BACKEND_ROUTE_MODULES,
    mountApplicationRoutes,
} from '../../config/applicationRoutes.registry.js';


describe('application backend route composition', () => {
    it('compose le module Dossiers M-001 sur le namespace Workspace', () => {
        expect(APPLICATION_BACKEND_ROUTE_MODULES).toEqual([
            expect.objectContaining({
                key: 'dossiers',
                mountPath: '/api/workspaces/:workspaceId/dossiers',
                router: expect.any(Function),
            }),
        ]);
    });

    it('monte un router métier sur son point de composition explicite', () => {
        const use = vi.fn();
        const app = { use };
        const router = vi.fn();

        mountApplicationRoutes(app, [
            {
                key: 'catalog',
                mountPath: '/api/workspaces/:workspaceId/catalog',
                router,
            },
        ]);

        expect(use).toHaveBeenCalledOnce();
        expect(use).toHaveBeenCalledWith(
            '/api/workspaces/:workspaceId/catalog',
            router,
        );
    });

    it('refuse deux modules avec la même clé applicative', () => {
        const app = { use: vi.fn() };
        const firstRouter = vi.fn();
        const secondRouter = vi.fn();

        expect(() => mountApplicationRoutes(app, [
            {
                key: 'catalog',
                mountPath: '/api/workspaces/:workspaceId/catalog',
                router: firstRouter,
            },
            {
                key: 'catalog',
                mountPath: '/api/workspaces/:workspaceId/catalog-admin',
                router: secondRouter,
            },
        ])).toThrow(
            'Duplicate application route module key: catalog',
        );
    });

    it('refuse deux modules montés sur le même chemin API', () => {
        const app = { use: vi.fn() };
        const firstRouter = vi.fn();
        const secondRouter = vi.fn();

        expect(() => mountApplicationRoutes(app, [
            {
                key: 'catalog',
                mountPath: '/api/workspaces/:workspaceId/catalog',
                router: firstRouter,
            },
            {
                key: 'pricing',
                mountPath: '/api/workspaces/:workspaceId/catalog',
                router: secondRouter,
            },
        ])).toThrow(
            'Duplicate application route mountPath: /api/workspaces/:workspaceId/catalog',
        );
    });

    it('refuse un chemin métier hors namespace /api', () => {
        const app = { use: vi.fn() };

        expect(() => mountApplicationRoutes(app, [
            {
                key: 'catalog',
                mountPath: '/catalog',
                router: vi.fn(),
            },
        ])).toThrow(
            'Application route module "catalog" has an invalid mountPath',
        );
    });
});
