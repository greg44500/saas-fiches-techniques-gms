import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    getE2eBackendEnvironment,
} from '../../../e2e/support/environment.js';

describe('environnement backend Playwright', () => {
    it('active explicitement le bypass avec les gardes E2E attendues', () => {
        const environment = getE2eBackendEnvironment();
        const databaseName = new URL(
            environment.MONGODB_URI,
        ).pathname.replace(/^\//, '');

        expect(environment.NODE_ENV).toBe('test');
        expect(databaseName.endsWith('_e2e_test')).toBe(true);
        expect(environment.E2E_BYPASS_RATE_LIMITS).toBe('true');
    });
});
