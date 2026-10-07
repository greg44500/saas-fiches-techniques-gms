import {
  ArrowLeft,
  WandSparkles,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useApplyTechnicalSheetOptimizationMutation,
  useGetTechnicalSheetOptimizationQuery,
  useSimulateTechnicalSheetOptimizationMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetOptimizerControlsPanel,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-controls-panel';
import {
  TechnicalSheetOptimizerEconomicsStrip,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-economics-strip';
import {
  TechnicalSheetOptimizerRecipePreview,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-recipe-preview';
import {
  buildOptimizationRequest,
  buildOptimizerLines,
  findOptimizerLine,
  findProjectionLine,
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
    controlsOpen,
    setControlsOpen,
  ] = useState(false);
  const [
    simulation,
    setSimulation,
  ] = useState(null);
  const [
    simulationStatus,
    setSimulationStatus,
  ] = useState('idle');
  const [
    simulationError,
    setSimulationError,
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
    setSimulationStatus('idle');
    setSimulationError(null);
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

    setSimulationStatus('pending');
    setSimulationError(null);

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
        setSimulationStatus('ready');
        setSimulationError(null);
      }

      return result;
    } catch (error) {
      const message =
        getTechnicalSheetApiErrorMessage(
          error,
          'Le scénario n’a pas pu être recalculé.',
        );

      if (
        sequence
        === requestSequenceRef.current
      ) {
        setSimulationStatus('error');
        setSimulationError(message);
      }

      if (showError) {
        toast({
          title:
            'Simulation impossible',
          description: message,
          variant: 'destructive',
        });
      }

      return null;
    }
  }

  useEffect(() => {
    if (!request) return undefined;

    setSimulationStatus('pending');
    setSimulationError(null);

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
    context?.baseline
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
      after,
      selectedLineId,
    )
    ?? findProjectionLine(
      before,
      selectedLineId,
    );
  const selectedAlternatives =
    context
      ?.alternatives?.[
        selectedLineId
      ]
    ?? null;
  const canApply =
    simulationStatus === 'ready'
    && Boolean(
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
    setSimulationStatus('idle');
    setSimulationError(null);
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
          minNetQuantity:
            suggestion
              .minNetQuantity
            ?? '',
          maxNetQuantity:
            suggestion
              .maxNetQuantity
            ?? '',
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

  const controls = (
    <TechnicalSheetOptimizerControlsPanel
      alternatives={
        selectedAlternatives
      }
      applying={
        applyState.isLoading
      }
      autoOptions={autoOptions}
      autoSuggestion={
        simulation?.autoSuggestion
        ?? null
      }
      canApply={canApply}
      canManageSourcing={
        context.canManageSourcing
      }
      comparing={
        simulateState.isLoading
      }
      costAdjustmentRange={
        context.costAdjustmentRange
      }
      curve={
        curve
        ?? context.neutralCurve
      }
      curvePoints={
        context.curvePoints
      }
      line={selectedLine}
      mode={mode}
      onApply={apply}
      onAutoOptionChange={
        (key, checked) =>
          setAutoOptions(
            (current) => ({
              ...current,
              [key]: checked,
            }),
          )
      }
      onChangeLine={updateLine}
      onCompare={() =>
        runSimulation()}
      onCurveChange={setCurve}
      onModeChange={setMode}
      onReset={reset}
      onTakeAutoSuggestion={
        takeAutoSuggestion
      }
      projectionLine={
        selectedProjectionLine
      }
    />
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
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

        <Button
          className="xl:hidden"
          onClick={() =>
            setControlsOpen(true)}
          type="button"
          variant="outline"
        >
          <WandSparkles
            aria-hidden="true"
            className="size-4"
          />
          Réglages
        </Button>
      </header>

      <TechnicalSheetOptimizerEconomicsStrip
        after={after}
        before={before}
        savings={
          simulation?.savings
          ?? {
            amountHt: '0',
            percent: '0',
          }
        }
        simulationError={
          simulationError
        }
        simulationStatus={
          simulationStatus
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <TechnicalSheetOptimizerRecipePreview
          after={after}
          baseline={before}
          onOpenControls={() =>
            setControlsOpen(true)}
          onSelect={setSelectedLineId}
          selectedLineId={
            selectedLineId
          }
        />

        <aside className="hidden xl:block">
          <div className="sticky top-[calc(var(--workspace-topbar-height,4rem)+1rem)] max-h-[calc(100vh-6rem)] overflow-y-auto pb-3">
            {controls}
          </div>
        </aside>
      </div>

      <Sheet
        onOpenChange={
          setControlsOpen
        }
        open={controlsOpen}
      >
        <SheetContent
          className="w-[min(94vw,28rem)] overflow-y-auto xl:hidden"
          side="right"
        >
          <SheetHeader>
            <SheetTitle>
              Réglages de l’Atelier
            </SheetTitle>
          </SheetHeader>
          <div className="p-4 pt-0">
            {controls}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export {
  TechnicalSheetOptimizerPage,
};
