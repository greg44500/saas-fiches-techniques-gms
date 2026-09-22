const serializeDossier = (dossier) => ({
    id: dossier._id.toString(),
    name: dossier.name,
    brand: dossier.brand ?? null,
    location: dossier.location
        ? {
            address: dossier.location.address ?? null,
            postalCode: dossier.location.postalCode ?? null,
            city: dossier.location.city ?? null,
        }
        : null,
    documentEmail: dossier.documentEmail ?? null,
    phone: dossier.phone ?? null,
    contactName: dossier.contactName ?? null,
    status: dossier.status,
    statusChangedAt: dossier.statusChangedAt,
    deletedAt: dossier.deletedAt ?? null,
    createdAt: dossier.createdAt,
    updatedAt: dossier.updatedAt,
});

const serializeDossierAccessGrant = (grant) => {
    const membership = grant.workspaceMember;

    const workspaceMember = (
        membership
        && typeof membership === 'object'
        && membership._id
    )
        ? {
            id: membership._id.toString(),
            status: membership.status,
            user: membership.user
                && typeof membership.user === 'object'
                ? {
                    id: membership.user._id.toString(),
                    firstName: membership.user.firstName,
                    lastName: membership.user.lastName,
                }
                : null,
            role: membership.role
                && typeof membership.role === 'object'
                ? {
                    id: membership.role._id.toString(),
                    key: membership.role.key,
                    name: membership.role.name,
                }
                : null,
        }
        : {
            id: membership.toString(),
        };

    return {
        id: grant._id.toString(),
        status: grant.status,
        workspaceMember,
        grantedAt: grant.grantedAt,
        revokedAt: grant.revokedAt ?? null,
        revocationReason: grant.revocationReason ?? null,
        createdAt: grant.createdAt,
        updatedAt: grant.updatedAt,
    };
};


export {
    serializeDossier,
    serializeDossierAccessGrant,
};
