import { useMemo, useState } from 'react';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/shared/toast-provider';
import { useUpdateDossierStatusMutation } from '@/features/dossiers/api/dossiers-api';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  createDossierMetadataLabelMaps,
  transitionNeedsReason,
} from '@/features/dossiers/lib/dossier-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function DossierLifecycleSection({ dossier, metadata, workspaceId }) {
  const { can } = useWorkspaceContext();
  const { toast } = useToast();
  const [pendingTransition, setPendingTransition] = useState(null);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [updateStatus, updateState] = useUpdateDossierStatusMutation();
  const labels = useMemo(
    () => createDossierMetadataLabelMaps(metadata).statuses,
    [metadata],
  );

  if (!can(DOSSIER_PERMISSION.LIFECYCLE_UPDATE)) {
    return null;
  }

  const transitions = metadata?.statusTransitions?.[dossier.status] ?? [];
  const requiresReason = pendingTransition
    ? transitionNeedsReason(dossier.status, pendingTransition)
    : false;

  function openTransition(status) {
    setReason('');
    setErrorMessage(null);
    setPendingTransition(status);
  }

  function closeTransition() {
    if (updateState.isLoading) return;
    setPendingTransition(null);
    setReason('');
    setErrorMessage(null);
  }

  async function confirmTransition() {
    if (!pendingTransition) return;

    if (requiresReason && !reason.trim()) {
      setErrorMessage('Une raison est obligatoire pour cette transition.');
      return;
    }

    try {
      await updateStatus({
        workspaceId,
        dossierId: dossier.id,
        status: pendingTransition,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }).unwrap();

      toast({
        title: 'Statut du dossier mis à jour',
        variant: 'success',
      });
      setPendingTransition(null);
      setReason('');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error?.data?.message ?? 'Le changement de statut a échoué.',
      );
    }
  }

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune transition de statut n’est disponible.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((status) => (
          <Button
            key={status}
            onClick={() => openTransition(status)}
            size="sm"
            type="button"
            variant={status === 'DELETED' ? 'destructive' : 'outline'}
          >
            {labels.get(status) ?? status}
          </Button>
        ))}
      </div>

      <ConfirmationDialog
        confirmLabel="Confirmer le changement"
        confirmVariant={pendingTransition === 'DELETED' ? 'destructive' : 'default'}
        description={
          pendingTransition
            ? `Passer ce dossier au statut « ${labels.get(pendingTransition) ?? pendingTransition} » ?`
            : undefined
        }
        errorMessage={errorMessage}
        onCancel={closeTransition}
        onConfirm={confirmTransition}
        open={Boolean(pendingTransition)}
        pending={updateState.isLoading}
        pendingLabel="Mise à jour…"
        title="Changer le statut du dossier"
      >
        {requiresReason && (
          <div className="mt-5 space-y-2">
            <label className="text-sm font-medium" htmlFor="dossier-status-reason">
              Raison
            </label>
            <Textarea
              id="dossier-status-reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </div>
        )}
      </ConfirmationDialog>
    </>
  );
}

export { DossierLifecycleSection };
