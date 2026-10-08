import {
  WandSparkles,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useListDossiersQuery,
} from '@/features/dossiers/api/dossiers-api';
import {
  useListTechnicalSheetsQuery,
  useStartTechnicalSheetDraftMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TECHNICAL_SHEET_FEATURE,
} from '@/features/technical-sheets/constants/technical-sheet-features';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetOptimizerLauncherPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    can,
    hasFeature,
    workspace,
  } = useWorkspaceContext();
  const canUseOptimizer =
    can(
      TECHNICAL_SHEET_PERMISSION.UPDATE,
    )
    && hasFeature(
      TECHNICAL_SHEET_FEATURE.OPTIMIZER,
    );
  const [
    selectedDossierId,
    setSelectedDossierId,
  ] = useState(null);
  const [
    openingSheetId,
    setOpeningSheetId,
  ] = useState(null);

  const dossiersQuery =
    useListDossiersQuery(
      {
        workspaceId:
          workspace.id,
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      },
      {
        skip: !canUseOptimizer,
      },
    );
  const dossiers =
    dossiersQuery.data
      ?.dossiers
    ?? [];

  useEffect(() => {
    if (
      !selectedDossierId
      && dossiers[0]?.id
    ) {
      setSelectedDossierId(
        dossiers[0].id,
      );
    }
  }, [
    dossiers,
    selectedDossierId,
  ]);

  const sheetsQuery =
    useListTechnicalSheetsQuery(
      {
        workspaceId:
          workspace.id,
        dossierId:
          selectedDossierId,
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      },
      {
        skip:
          !canUseOptimizer
          || !selectedDossierId,
      },
    );
  const [startDraft] =
    useStartTechnicalSheetDraftMutation();

  async function openOptimizer(
    sheet,
  ) {
    if (
      !sheet
      || !selectedDossierId
    ) {
      return;
    }

    setOpeningSheetId(sheet.id);

    try {
      if (!sheet.hasDraft) {
        if (
          !sheet.currentValidatedStateId
        ) {
          throw new Error(
            'Aucun brouillon exploitable.',
          );
        }

        await startDraft({
          workspaceId:
            workspace.id,
          dossierId:
            selectedDossierId,
          technicalSheetId:
            sheet.id,
          expectedSheetRevision:
            sheet.revision,
        }).unwrap();
      }

      navigate(
        '/workspaces/' + workspace.id
        + '/dossiers/'
        + selectedDossierId
        + '/technical-sheets/'
        + sheet.id
        + '/optimization',
      );
    } catch (error) {
      toast({
        title: 'Action impossible',
        description:
          getTechnicalSheetApiErrorMessage(
            error,
            'L’Atelier d’optimisation n’a pas pu être ouvert.',
          ),
        variant: 'destructive',
      });
    } finally {
      setOpeningSheetId(null);
    }
  }

  if (!canUseOptimizer) {
    return (
      <ErrorState
        description="Votre rôle ou l’offre du Workspace ne permet pas d’utiliser l’Atelier d’optimisation."
        title="Atelier indisponible"
      />
    );
  }

  if (
    dossiersQuery.isLoading
    && !dossiersQuery.data
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement de l’Atelier…
      </p>
    );
  }

  if (dossiersQuery.isError) {
    return (
      <ErrorState
        description="Les Dossiers accessibles n’ont pas pu être chargés."
        onRetry={dossiersQuery.refetch}
        title="Atelier indisponible"
      />
    );
  }

  const sheets =
    sheetsQuery.data
      ?.sheets
    ?? [];
  const dossierItems =
    dossiers.map(
      (dossier) => ({
        value: dossier.id,
        label: dossier.name,
      }),
    );

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <WandSparkles
            aria-hidden="true"
            className="size-5"
          />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Atelier d’optimisation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Choisissez un Dossier puis une Fiche technique. L’Atelier ouvre la même simulation économique non destructive que depuis la Fiche.
          </p>
        </div>
      </header>

      {dossiers.length === 0
        ? (
          <EmptyState
            description="Aucun Dossier actif accessible ne permet d’ouvrir une Fiche technique."
            title="Aucun Dossier disponible"
          />
        )
        : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Dossier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  items={dossierItems}
                  onValueChange={
                    setSelectedDossierId
                  }
                  value={
                    selectedDossierId
                  }
                >
                  <SelectTrigger
                    aria-label="Choisir un Dossier pour l’Atelier"
                    className="max-w-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dossierItems.map(
                      (item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {sheetsQuery.isLoading
            && !sheetsQuery.data
              ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des Fiches techniques…
                </p>
              )
              : sheetsQuery.isError
                ? (
                  <ErrorState
                    description="Les Fiches techniques de ce Dossier n’ont pas pu être chargées."
                    onRetry={sheetsQuery.refetch}
                    title="Fiches indisponibles"
                  />
                )
                : sheets.length === 0
                  ? (
                    <EmptyState
                      description="Ce Dossier ne contient aucune Fiche technique active exploitable par l’Atelier."
                      title="Aucune Fiche disponible"
                    />
                  )
                  : (
                    <section className="grid gap-3 lg:grid-cols-2">
                      {sheets.map(
                        (sheet) => (
                          <Card key={sheet.id}>
                            <CardContent className="flex h-full items-center justify-between gap-4 p-4">
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {sheet.name}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {sheet.hasDraft
                                    ? 'Brouillon disponible'
                                    : 'Version validée · un brouillon sera créé à l’ouverture'}
                                </p>
                              </div>
                              <Button
                                disabled={
                                  openingSheetId
                                  === sheet.id
                                }
                                onClick={() =>
                                  openOptimizer(
                                    sheet,
                                  )}
                                size="sm"
                                type="button"
                              >
                                <WandSparkles
                                  aria-hidden="true"
                                  className="size-4"
                                />
                                {openingSheetId
                                  === sheet.id
                                  ? 'Ouverture…'
                                  : 'Optimiser'}
                              </Button>
                            </CardContent>
                          </Card>
                        ),
                      )}
                    </section>
                  )}
          </>
        )}
    </div>
  );
}

export {
  TechnicalSheetOptimizerLauncherPage,
};
