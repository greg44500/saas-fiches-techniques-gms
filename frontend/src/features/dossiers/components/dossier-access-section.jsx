import { useMemo, useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useGrantDossierAccessMutation,
  useListDossierAccessGrantsQuery,
  useRevokeDossierAccessMutation,
} from '@/features/dossiers/api/dossiers-api';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import { useListWorkspaceMembersQuery } from '@/features/workspace-members/api/workspace-members-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useDataPagination } from '@/hooks/use-data-pagination';

const ACCESS_GRANT_LIMIT = 100;

function getMemberLabel(member) {
  return [member?.user?.firstName, member?.user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Membre';
}

function DossierAccessSection({ dossier, workspaceId }) {
  const { can, hasFeature } = useWorkspaceContext();
  const { toast } = useToast();
  const [mutationError, setMutationError] = useState(null);
  const canRead = can(DOSSIER_PERMISSION.ACCESS_READ);
  const canManage = can(DOSSIER_PERMISSION.ACCESS_MANAGE);
  const canReadMembers = can(WORKSPACE_PERMISSION.MEMBER_READ);
  const hasTeamManagement = hasFeature(WORKSPACE_FEATURE.TEAM_MANAGEMENT);
  const canManageInCurrentState = ['ACTIVE', 'PAUSED'].includes(dossier.status);
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination({ initialPageSize: 10 });

  const grantsQuery = useListDossierAccessGrantsQuery(
    {
      workspaceId,
      dossierId: dossier.id,
      page: 1,
      limit: ACCESS_GRANT_LIMIT,
    },
    { skip: !canRead },
  );
  const membersQuery = useListWorkspaceMembersQuery(
    {
      workspaceId,
      page,
      limit: pageSize,
    },
    { skip: !canManage || !canReadMembers || !hasTeamManagement },
  );
  const [grantAccess, grantState] = useGrantDossierAccessMutation();
  const [revokeAccess, revokeState] = useRevokeDossierAccessMutation();

  const activeGrantByMembershipId = useMemo(
    () => new Map(
      (grantsQuery.data?.accessGrants ?? []).map((grant) => [
        grant.workspaceMember.id,
        grant,
      ]),
    ),
    [grantsQuery.data?.accessGrants],
  );

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        Votre rôle ne permet pas de consulter les affectations de ce dossier.
      </p>
    );
  }

  if (grantsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement des accès…</p>;
  }

  if (grantsQuery.isError) {
    return (
      <ErrorState
        className="p-0"
        description="Les affectations de ce dossier n’ont pas pu être chargées."
        onRetry={grantsQuery.refetch}
        title="Accès indisponibles"
      />
    );
  }

  const activeGrants = grantsQuery.data?.accessGrants ?? [];
  const candidateMembers = (membersQuery.data?.members ?? []).filter(
    (member) => member.status === 'active' && member.role?.key !== 'owner',
  );
  const mutationPending = grantState.isLoading || revokeState.isLoading;

  async function toggleMember(member) {
    const existingGrant = activeGrantByMembershipId.get(member.id);
    setMutationError(null);

    try {
      if (existingGrant) {
        await revokeAccess({
          workspaceId,
          dossierId: dossier.id,
          membershipId: member.id,
        }).unwrap();

        toast({
          title: 'Accès au dossier révoqué',
          variant: 'success',
        });
        return;
      }

      await grantAccess({
        workspaceId,
        dossierId: dossier.id,
        membershipId: member.id,
      }).unwrap();

      toast({
        title: 'Accès au dossier accordé',
        variant: 'success',
      });
    } catch (error) {
      setMutationError(
        error?.data?.message ?? 'La modification de l’affectation a échoué.',
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium">Workspace Owner</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Accès implicite à tous les dossiers du workspace. Aucun grant individuel n’est créé.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium">
          Affectations actives ({activeGrants.length})
        </p>
        {activeGrants.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Pas de membres affectés.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {activeGrants.map((grant) => (
              <li className="p-3" key={grant.id}>
                <p className="text-sm font-medium">
                  {getMemberLabel(grant.workspaceMember)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {grant.workspaceMember.role?.name ?? 'Rôle non renseigné'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold">Gérer les affectations</h4>

          {!canManageInCurrentState ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Les affectations ne peuvent être modifiées que pour un dossier actif ou en pause.
            </p>
          ) : !canReadMembers ? (
            <p className="mt-2 text-sm text-muted-foreground">
              La consultation des membres du workspace est nécessaire pour attribuer un dossier.
            </p>
          ) : !hasTeamManagement ? (
            <p className="mt-2 text-sm text-muted-foreground">
              La gestion des membres n’est pas disponible pour ce workspace.
            </p>
          ) : membersQuery.isError ? (
            <ErrorState
              className="mt-2 p-0"
              description="Les membres du workspace n’ont pas pu être chargés."
              onRetry={membersQuery.refetch}
              title="Membres indisponibles"
            />
          ) : (
            <>
              {mutationError && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {mutationError}
                </p>
              )}

              <div className="mt-3 space-y-2">
                {membersQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement des membres…</p>
                ) : candidateMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun membre disponible à l’affectation.
                  </p>
                ) : candidateMembers.map((member) => {
                  const assigned = activeGrantByMembershipId.has(member.id);

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                      key={member.id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {getMemberLabel(member)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.role?.name ?? 'Rôle non renseigné'}
                        </p>
                      </div>
                      <Button
                        disabled={mutationPending}
                        onClick={() => toggleMember(member)}
                        size="sm"
                        type="button"
                        variant={assigned ? 'outline' : 'default'}
                      >
                        {assigned ? 'Révoquer' : 'Affecter'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <DataPagination
                ariaLabel="Pagination des membres assignables"
                disabled={membersQuery.isFetching || mutationPending}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={membersQuery.data?.pagination}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { ACCESS_GRANT_LIMIT, DossierAccessSection, getMemberLabel };
