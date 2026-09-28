import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useGetDossierTechnicalSheetSettingsQuery,
  useUpdateDossierTechnicalSheetSettingsMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  basisPointsToInput,
  getTechnicalSheetApiErrorMessage,
  percentInputToBasisPoints,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetSettingsPage() {
  const { dossierId } = useParams();
  const { can, membership, workspace } = useWorkspaceContext();
  const { toast } = useToast();
  const query = useGetDossierTechnicalSheetSettingsQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const [updateSettings, updateState] =
    useUpdateDossierTechnicalSheetSettingsMutation();
  const [margin, setMargin] = useState('');

  useEffect(() => {
    if (!query.data) return;
    setMargin(
      basisPointsToInput(
        query.data.defaultTargetMarginBasisPoints,
      ),
    );
  }, [query.data]);

  if (query.isLoading && !query.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des réglages…
      </p>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        description="Les réglages de Fiches techniques n’ont pas pu être chargés."
        onRetry={query.refetch}
        title="Réglages indisponibles"
      />
    );
  }

  const canManage = can(TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE);
  const isOwner = membership?.role?.key === 'owner';

  async function saveMargin() {
    const basisPoints = margin.trim()
      ? percentInputToBasisPoints(margin)
      : null;

    if (margin.trim() && basisPoints === null) {
      toast({
        title: 'Marge invalide',
        description: 'Renseignez un pourcentage valide.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSettings({
        workspaceId: workspace.id,
        dossierId,
        defaultTargetMarginBasisPoints: basisPoints,
      }).unwrap();
      toast({
        title: 'Marge par défaut mise à jour',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <Button asChild size="sm" variant="ghost">
          <Link
            to={
              '/workspaces/' + workspace.id
              + '/dossiers/' + dossierId
              + '/technical-sheets'
            }
          >
            Retour aux Fiches techniques
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Réglages des Fiches techniques
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les réglages du Dossier servent de valeurs initiales aux nouvelles Fiches et aux copies reçues.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Marge cible par défaut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="technical-sheet-default-margin">
              Marge cible (%)
            </FieldLabel>
            <Input
              disabled={!canManage || updateState.isLoading}
              id="technical-sheet-default-margin"
              inputMode="decimal"
              onChange={(event) => setMargin(event.target.value)}
              placeholder="Ex. 70"
              value={margin}
            />
          </Field>
          <p className="text-sm text-muted-foreground">
            Laisser vide signifie qu’aucune marge cible n’est préremplie. Modifier cette valeur ne recalcule pas les Fiches existantes.
          </p>
          {canManage && (
            <div className="flex justify-end">
              <Button
                disabled={updateState.isLoading}
                onClick={saveMargin}
                type="button"
              >
                Enregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Corbeille du Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La durée de conservation et les purges définitives sont administrées au niveau du Workspace.
            </p>
            <Button asChild variant="outline">
              <Link to={'/workspaces/' + workspace.id + '/technical-sheets/trash'}>
                Ouvrir la corbeille
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { TechnicalSheetSettingsPage };
