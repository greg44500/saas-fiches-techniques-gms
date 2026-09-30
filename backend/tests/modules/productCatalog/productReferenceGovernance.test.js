import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PRODUCT_GOVERNANCE_STATUS,
} from '../../../modules/productCatalog/productCatalog.registry.js';
import {
    buildPlatformGovernanceVisibilityFilter,
    buildWorkspaceGovernanceVisibilityFilter,
} from '../../../modules/productCatalog/productReferenceGovernance.service.js';

describe('M-002 governance filters with sanitizeFilter', () => {
    it('préserve le sélecteur $in Platform explicitement approuvé', () => {
        const filter = buildPlatformGovernanceVisibilityFilter();

        mongoose.sanitizeFilter(filter);

        expect(filter.governanceStatus).toEqual({
            $in: [
                PRODUCT_GOVERNANCE_STATUS.APPROVED,
                PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
            ],
        });
    });

    it('préserve la visibilité Workspace sans opérateur imbriqué non fiable', () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const filter = buildWorkspaceGovernanceVisibilityFilter(workspaceId);

        mongoose.sanitizeFilter(filter);

        expect(filter).toEqual({
            $or: [
                {
                    governanceStatus:
                        PRODUCT_GOVERNANCE_STATUS.APPROVED,
                },
                {
                    governanceStatus:
                        PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
                    contributedFromWorkspace: workspaceId,
                },
            ],
        });
    });
});
