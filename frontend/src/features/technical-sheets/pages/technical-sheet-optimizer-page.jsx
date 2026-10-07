import {
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router';

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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  useApplyTechnicalSheetOptimizationMutation,
  useGetTechnicalSheetOptimizationQuery,
  useSimulateTechnicalSheetOptimizationMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetOptimizationCurve,
} from '@/features/technical-sheets/components/technical-sheet-optimization-curve';
import {
  TechnicalSheetOptimizerInspector,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-inspector';
import {
  buildOptimizationRequest,
  buildOptimizerLines,
  findOptimizerLine,
  findProjectionLine,
  formatCurrency,
  formatPercent,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

const DEFAULT_AUTO_OPTIONS = Object.freeze({
  adjustQuantities: true,
  productAlternatives: true,
  sourcingAlternatives: true,
});

function marginLabel(basisPoints) {
  if (!Number.isFinite(Number(basisPoints))) {
    return '—';
  }

  return formatPercent(
    Number(basisPoints) / 100,
  );
}

function economicsValue(
  projection,
  key,
) {
  return projection
    ?.economicSnapshot?.[key]
    ?? null;
}

function TechnicalSheetOptimizerPage() {
  const {
    dossierId,
    technicalSheetId,
  } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { workspace } =
    useWorkspaceContext();

  const contextQuery =
    useGetTechnicalSheetOptimizationQuery({
      workspaceId: workspace.id,
      dossierId,
      technicalSheetId,
    });
  const [
    simulate,
    simulateState,
  ] =
    useSimulateTechnicalSheetOptimizationMutation();
  const [
    applyOptimization,
    applyState,
  ] =
    useApplyTechnicalSheetOptimizationMutation();

  const [mode, setMode] =
    useState('MANUAL');
  const [curve, setCurve] =
    useState(null);
  const [lines, setLines] =
    useState([]);
  const [autoOptions, setAutoOptions] =
    useState({
      ...DEFAULT_AUTO_OPTIONS,
    });
  const [
    selectedLineId,
    setSelectedLineId,
  ] = useState(null);
  const [
    inspectorOpen,
    setInspectorOpen,
  ] = useState(false);
  const [
    simulation,
    setSimulation,
  ] = useState(null);
  const initializedRevisionRef =
    useRef(null);
  const requestSequenceRef =
    useRef(0);

  const context =
    contextQuery.data;
  const draftRevision =
    context?.draft?.revision
    ?? null;

  useEffect(() => {
    if (
      !context
      || initializedRevisionRef.current
        === draftRevision
    ) {
      return;
    }

    const nextLines =
      buildOptimizerLines(context);

    setMode('MANUAL');
    setCurve({
      enabled:
        context.neutralCurve.enabled,
      pressures: {
        ...context.neutralCurve
          .pressures,
      },
    });
    setLines(nextLines);
    setAutoOptions({
      ...DEFAULT_AUTO_OPTIONS,
    });
    setSelectedLineId(
      nextLines[0]?.lineId
      ?? null,
    );
    setSimulation(null);
    initializedRevisionRef.current =
      draftRevision;
  }, [context, draftRevision]);

  const request = useMemo(() => {
    if (
      !context
      || !curve
      || draftRevision === null
    ) {
      return null;
    }

    return buildOptimizationRequest({
      autoOptions,
      curve,
      draftRevision,
      lines,
      mode,
    });
  }, [
    autoOptions,
    context,
    curve,
    draftRevision,
    lines,
    mode,
  ]);

  async function runSimulation({
    showError = true,
  } = {}) {
    if (!request) return null;

    const sequence =
      requestSequenceRef.current + 1;
    requestSequenceRef.current =
      sequence;

    try {
      const result =
        await simulate({
          workspaceId:
            workspace.id,
          dossierId,
          technicalSheetId,
          ...request,
        }).unwrap();

      if (
        sequence
        === requestSequenceRef.current
      ) {
        setSimulation(result);
      }

      return result;
    } catch (error) {
      if (
        sequence
        === requestSequenceRef.current
      ) {
        setSimulation(null);
      }

      if (showError) {
        toast({
          title:
            'Simulation impossible',
          description:
            getTechnicalSheetApiErrorMessage(
              error,
              'Le scénario n’a pas pu être recalculé.',
            ),
          variant: 'destructive',
        });
      }

      return null;
    }
  }

  useEffect(() => {
    if (!request) return undefined;

    const timeout =
      window.setTimeout(
        () => {
          runSimulation({
            showError: false,
          });
        },
        400,
      );

    return () =>
      window.clearTimeout(timeout);
  // request serializes all simulation inputs and is the intended trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const before =
    simulation?.before
    ?? context?.baseline
    ?? null;
  const after =
    simulation?.after
    ?? before;
  const selectedLine =
    findOptimizerLine(
      lines,
      selectedLineId,
    );
  const selectedProjectionLine =
    findProjectionLine(
      context?.baseline,
      selectedLineId,
    );
  const selectedAlternatives =
    context
      ?.alternatives?.[
        selectedLineId
      ]
    ?? null;
  const canApply =
    Boolean(
      simulation
        ?.simulationFingerprint,
    )
    && (
      simulation
        ?.transformations
        ?.length
      ?? 0
    ) > 0
    && !applyState.isLoading;

  function updateLine(nextLine) {
    setLines((current) =>
      current.map((line) =>
        line.lineId
        === nextLine.lineId
          ? nextLine
          : line,
      ));
  }

  function reset() {
    if (!context) return;

    const nextLines =
      buildOptimizerLines(context);

    setMode('MANUAL');
    setCurve({
      enabled:
        context.neutralCurve.enabled,
      pressures: {
        ...context.neutralCurve
          .pressures,
      },
    });
    setLines(nextLines);
    setAutoOptions({
      ...DEFAULT_AUTO_OPTIONS,
    });
    setSimulation(null);
    setSelectedLineId(
      nextLines[0]?.lineId
      ?? null,
    );
  }

  function takeAutoSuggestion() {
    const resolved =
      simulation
        ?.autoSuggestion
        ?.resolvedIntents;

    if (!resolved) return;

    setLines((current) =>
      current.map((line) => {
        const suggestion =
          resolved.find(
            (entry) =>
              entry.lineId
              === line.lineId,
          );

        if (!suggestion) return line;

        return {
          ...line,
          ...suggestion,
          supplierArticleTouched:
            Boolean(
              suggestion
                .supplierArticleId,
            ),
          localNetQuantity:
            suggestion
              .localNetQuantity
            ?? '',
        };
      }));
    setCurve({
      enabled:
        context.neutralCurve.enabled,
      pressures: {
        ...context.neutralCurve
          .pressures,
      },
    });
    setMode('MANUAL');
  }

  async function apply() {
    if (
      !request
      || !simulation
        ?.simulationFingerprint
    ) {
      return;
    }

    try {
      const result =
        await applyOptimization({
          workspaceId:
            workspace.id,
          dossierId,
          technicalSheetId,
          ...request,
          simulationFingerprint:
            simulation
              .simulationFingerprint,
        }).unwrap();

      toast({
        title:
          'Optimisation appliquée au brouillon',
        description:
          'Le brouillon a été revalorisé. Vous pouvez maintenant le relire puis le valider depuis la Fiche.',
        variant: 'success',
      });

      if (result?.draft?.revision) {
        navigate(
          '/workspaces/'
          + workspace.id
          + '/dossiers/'
          + dossierId
          + '/technical-sheets/'
          + technicalSheetId,
        );
      }
    } catch (error) {
      toast({
        title:
          'Application impossible',
        description:
          getTechnicalSheetApiErrorMessage(
            error,
            'La simulation doit être recalculée avant de pouvoir être appliquée.',
          ),
        variant: 'destructive',
      });
    }
  }

  if (
    contextQuery.isLoading
    && !context
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement de l’Atelier d’optimisation…
      </p>
    );
  }

  if (
    contextQuery.isError
    || !context
  ) {
    return (
      <ErrorState
        description={
          getTechnicalSheetApiErrorMessage(
            contextQuery.error,
            'Le brouillon doit être valorisé et accessible pour ouvrir l’Atelier.',
          )
        }
        onRetry={
          contextQuery.refetch
        }
        title="Atelier indisponible"
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            aria-label="Retour à la Fiche technique"
            onClick={() =>
              navigate(
                '/workspaces/'
                + workspace.id
                + '/dossiers/'
                + dossierId
                + '/technical-sheets/'
                + technicalSheetId,
              )}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4"
            />
          </Button>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Atelier d’optimisation
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {context.sheet.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            aria-label="Mode d’optimisation"
            className="flex rounded-lg border border-border p-1"
            role="group"
          >
            <Button
              onClick={() =>
                setMode('MANUAL')}
              size="sm"
              type="button"
              variant={
                mode === 'MANUAL'
                  ? 'secondary'
                  : 'ghost'
              }
            >
              Manuel
            </Button>
            <Button
              onClick={() =>
                setMode('AUTO')}
              size="sm"
              type="button"
              variant={
                mode === 'AUTO'
                  ? 'secondary'
                  : 'ghost'
              }
            >
              <Sparkles
                aria-hidden="true"
                className="size-4"
              />
              Auto
            </Button>
          </div>

          <Button
            onClick={reset}
            type="button"
            variant="outline"
          >
            <RotateCcw
              aria-hidden="true"
              className="size-4"
            />
            Réinitialiser
          </Button>

          <Button
            disabled={
              simulateState.isLoading
            }
            onClick={() =>
              runSimulation()}
            type="button"
            variant="outline"
          >
            {simulateState.isLoading
              ? 'Calcul…'
              : 'Comparer'}
          </Button>

          <Button
            disabled={!canApply}
            onClick={apply}
            type="button"
          >
            {applyState.isLoading
              ? 'Application…'
              : 'Appliquer au brouillon'}
          </Button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Coût matière HT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-semibold">
              {formatCurrency(
                economicsValue(
                  after,
                  'materialCostHt',
                ),
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Avant : {formatCurrency(
                economicsValue(
                  before,
                  'materialCostHt',
                ),
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Coût de fabrication HT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-semibold">
              {formatCurrency(
                economicsValue(
                  after,
                  'manufacturingCostHt',
                ),
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Avant : {formatCurrency(
                economicsValue(
                  before,
                  'manufacturingCostHt',
                ),
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Marge réelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-semibold">
              {marginLabel(
                economicsValue(
                  after,
                  'actualMarginBasisPoints',
                ),
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Avant : {marginLabel(
                economicsValue(
                  before,
                  'actualMarginBasisPoints',
                ),
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Économie estimée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xl font-semibold">
              {formatCurrency(
                simulation
                  ?.savings?.amountHt
                ?? '0',
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPercent(
                simulation
                  ?.savings?.percent
                ?? '0',
              )}
              {' '}
              sur la production
            </p>
          </CardContent>
        </Card>
      </section>

      {mode === 'AUTO'
        ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Leviers automatiques
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Le serveur recherche un seul prochain mouvement économiquement favorable. Il ne modifie rien avant votre validation.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                [
                  'adjustQuantities',
                  'Ajuster les quantités',
                ],
                [
                  'productAlternatives',
                  'Tester les alternatives Produit',
                ],
                [
                  'sourcingAlternatives',
                  'Tester les approvisionnements',
                ],
              ].map(([key, label]) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                  key={key}
                >
                  <span>{label}</span>
                  <Switch
                    checked={
                      autoOptions[key]
                    }
                    disabled={
                      key
                        === 'sourcingAlternatives'
                      && !context
                        .canManageSourcing
                    }
                    onCheckedChange={(checked) =>
                      setAutoOptions(
                        (current) => ({
                          ...current,
                          [key]: checked,
                        }),
                      )}
                  />
                </label>
              ))}

              {simulation?.autoSuggestion && (
                <div className="md:col-span-3 flex flex-col gap-3 rounded-lg bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">
                      Proposition automatique disponible
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {simulation.autoSuggestion.kind === 'QUANTITY'
                        ? 'Ajustement d’une quantité'
                        : simulation.autoSuggestion.kind === 'PRODUCT'
                          ? 'Alternative Produit'
                          : 'Alternative d’approvisionnement'}
                      {simulation.autoSuggestion.label
                        ? ' · ' + simulation.autoSuggestion.label
                        : ''}
                    </p>
                  </div>
                  <Button
                    onClick={
                      takeAutoSuggestion
                    }
                    type="button"
                    variant="outline"
                  >
                    Reprendre en Manuel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
        : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Courbe globale %CM
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Les cinq points appliquent une pression économique entre le minimum, la référence et le maximum déclarés pour chaque ingrédient.
              </p>
            </CardHeader>
            <CardContent>
              <TechnicalSheetOptimizationCurve
                curve={curve}
                onChange={setCurve}
                points={
                  context.curvePoints
                }
              />
            </CardContent>
          </Card>
        )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">
              Ingrédients · avant / après
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-y border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      Ingrédient
                    </th>
                    <th className="px-4 py-3">
                      Quantité
                    </th>
                    <th className="px-4 py-3">
                      %CM
                    </th>
                    <th className="px-4 py-3">
                      Coût HT
                    </th>
                    <th className="px-4 py-3">
                      Évolution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(context.baseline.lines ?? [])
                    .filter(
                      (line) =>
                        line.kind
                        === 'INGREDIENT',
                    )
                    .map((line) => {
                      const next =
                        findProjectionLine(
                          after,
                          line.id,
                        )
                        ?? line;
                      const changed =
                        line.netQuantity
                          !== next.netQuantity
                        || line.productVariantId
                          !== next.productVariantId
                        || line.supplierArticleId
                          !== next.supplierArticleId;

                      return (
                        <tr
                          className={
                            'cursor-pointer border-b border-border transition-colors hover:bg-muted/40 '
                            + (
                              selectedLineId
                                === line.id
                                ? 'bg-muted/50'
                                : ''
                            )
                          }
                          key={line.id}
                          onClick={() => {
                            setSelectedLineId(
                              line.id,
                            );
                            setInspectorOpen(
                              true,
                            );
                          }}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {next.productVariantName
                                ?? line.productVariantName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {line.productVariantName}
                            </p>
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {line.netQuantity}
                            {' → '}
                            {next.netQuantity}
                            {' '}
                            {next.referenceUnit}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatPercent(
                              line.materialCostSharePercent,
                            )}
                            {' → '}
                            {formatPercent(
                              next.materialCostSharePercent,
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatCurrency(
                              line.lineCostHt,
                            )}
                            {' → '}
                            {formatCurrency(
                              next.lineCostHt,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {changed
                              ? 'Modifiée'
                              : 'Stable'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="hidden xl:block">
          <div className="sticky top-[calc(var(--workspace-topbar-height,4rem)+1rem)]">
            <TechnicalSheetOptimizerInspector
              alternatives={
                selectedAlternatives
              }
              canManageSourcing={
                context.canManageSourcing
              }
              line={selectedLine}
              onChange={updateLine}
              projectionLine={
                selectedProjectionLine
              }
            />
          </div>
        </div>
      </div>

      <Sheet
        onOpenChange={
          setInspectorOpen
        }
        open={inspectorOpen}
      >
        <SheetContent
          className="w-[min(92vw,26rem)] overflow-y-auto xl:hidden"
          side="right"
        >
          <SheetHeader>
            <SheetTitle>
              Réglages de l’ingrédient
            </SheetTitle>
          </SheetHeader>
          <div className="p-4 pt-0">
            <TechnicalSheetOptimizerInspector
              alternatives={
                selectedAlternatives
              }
              canManageSourcing={
                context.canManageSourcing
              }
              line={selectedLine}
              onChange={updateLine}
              projectionLine={
                selectedProjectionLine
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export {
  TechnicalSheetOptimizerPage,
};
