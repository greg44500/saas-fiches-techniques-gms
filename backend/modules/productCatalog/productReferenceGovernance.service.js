import mongoose from 'mongoose';

import {
    PRODUCT_GOVERNANCE_STATUS,
} from './productCatalog.registry.js';

const buildWorkspaceGovernanceVisibilityFilter = (workspaceId) => {
    if (!workspaceId) {
        return {
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        };
    }

    return mongoose.trusted({
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
};

const buildPlatformGovernanceVisibilityFilter = () => mongoose.trusted({
    governanceStatus: {
        $in: [
            PRODUCT_GOVERNANCE_STATUS.APPROVED,
            PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
        ],
    },
});

const buildDuplicateGovernanceVisibilityFilter = (workspaceId) => {
    if (!workspaceId) {
        return buildPlatformGovernanceVisibilityFilter();
    }

    return buildWorkspaceGovernanceVisibilityFilter(workspaceId);
};

const isReferenceVisibleToWorkspace = ({
    reference,
    workspaceId,
}) => {
    if (!reference) return false;

    const governanceStatus = reference.governanceStatus
        ?? PRODUCT_GOVERNANCE_STATUS.APPROVED;

    if (governanceStatus === PRODUCT_GOVERNANCE_STATUS.APPROVED) {
        return true;
    }

    return (
        governanceStatus === PRODUCT_GOVERNANCE_STATUS.PROVISIONAL
        && Boolean(workspaceId)
        && reference.contributedFromWorkspace?.toString?.()
            === workspaceId.toString()
    );
};

export {
    buildDuplicateGovernanceVisibilityFilter,
    buildPlatformGovernanceVisibilityFilter,
    buildWorkspaceGovernanceVisibilityFilter,
    isReferenceVisibleToWorkspace,
};
