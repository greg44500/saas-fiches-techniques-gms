import { describe, expect, it } from 'vitest';

import { APPLICATION_IDENTITY } from '@/app/application-identity';

describe('application identity', () => {
  it('expose une identité applicative contrôlée', () => {
    expect(APPLICATION_IDENTITY).toEqual({
      name: 'Fiches techniques',
      shortName: 'GMS',
    });
  });
});
