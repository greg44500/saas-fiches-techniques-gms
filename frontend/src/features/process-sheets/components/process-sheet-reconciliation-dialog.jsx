import { useEffect, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useGetProcessSheetReconciliationQuery, useReconcileProcessSheetMutation,
} from '@/features/process-sheets/api/process-sheets-api';

const reasonText = {
  PARENT_UNAVAILABLE: 'La Fiche technique doit être active et validée pour poursuivre.',
  REFERENCE_UNAVAILABLE: 'Une composition officielle nécessaire à la comparaison est indisponible. Contactez un responsable.',
};

function ProcessSheetReconciliationDialog({
  applyUnavailableReason, canApply, dossierId, onClose, onUpdated, open, processSheetId,
  workspaceId,
}) {
  const [choices, setChoices] = useState({});
  const [error, setError] = useState('');
  const review = useGetProcessSheetReconciliationQuery(
    { workspaceId, dossierId, processSheetId }, { skip: !open },
  );
  const [reconcile, state] = useReconcileProcessSheetMutation();
  const plan = review.data;
  const outstanding = plan?.assignments?.filter((item) =>
    !item.proposedTo && !Object.hasOwn(choices, item.from)) ?? [];
  const invalid = plan?.assignments?.some((item) =>
    Object.hasOwn(choices, item.from) && choices[item.from] === '') ?? false;
  const selectedTargets = plan?.assignments?.map((item) =>
    Object.hasOwn(choices, item.from) ? choices[item.from] : item.proposedTo)
    .filter((item) => item && item !== '__REMOVE__') ?? [];
  const duplicateTargets = new Set(selectedTargets).size !== selectedTargets.length;
  const confirmationDisabled = !canApply || plan?.status !== 'REVIEW_REQUIRED'
    || Boolean(outstanding.length) || invalid || duplicateTargets || state.isLoading
    || review.isLoading || review.isFetching || review.isError;
  const confirmationHelp = review.isError
    ? 'La comparaison n’a pas pu être chargée. Réessayez avant de confirmer.'
    : review.isLoading || review.isFetching || !plan
      ? 'La comparaison doit être terminée avant toute actualisation.'
      : plan.status === 'CURRENT'
        ? 'La composition utilisée est déjà la bonne. Il n’y a rien à actualiser.'
        : plan.status !== 'REVIEW_REQUIRED'
            ? 'La Fiche technique doit être active et sa composition accessible.'
            : !canApply
              ? applyUnavailableReason ?? 'Enregistrez votre travail et vérifiez vos droits avant de confirmer.'
              : outstanding.length || invalid
                ? 'Choisissez une correspondance ou retirez explicitement chaque association incertaine.'
                : duplicateTargets
                  ? 'Deux ingrédients pointent vers la même occurrence. Sélectionnez des occurrences distinctes.'
                  : state.isLoading
                    ? 'L’actualisation est en cours.'
                    : 'Actualiser';

  useEffect(() => {
    setChoices({});
    setError('');
  }, [plan?.currentValidationId, plan?.processRevision, plan?.draftRevision]);

  useEffect(() => {
    if (!open) {
      setChoices({});
      setError('');
    }
  }, [open]);

  const submit = async () => {
    if (!canApply || review.isError || plan?.status !== 'REVIEW_REQUIRED'
      || outstanding.length || invalid || duplicateTargets || state.isLoading) return;
    setError('');
    try {
      await reconcile({
        workspaceId, dossierId, processSheetId,
        expectedRevision: plan.processRevision,
        expectedDraftRevision: plan.draftRevision,
        currentValidationId: plan.currentValidationId,
        decisions: Object.entries(choices).map(([from, to]) => ({
          from, to: to === '__REMOVE__' ? null : to,
        })),
      }).unwrap();
      await onUpdated();
      onClose();
    } catch (failure) {
      const code = failure?.data?.code;
      setError(code === 'PROCESS_SHEET_CHANGED' || code === 'PROCESS_SHEET_PARENT_CHANGED'
        ? 'Les données ont changé depuis la comparaison. Actualisez l’analyse avant de confirmer.'
        : code === 'PROCESS_SHEET_MAPPING_REQUIRED' || code === 'PROCESS_SHEET_MAPPING_INVALID'
          ? 'Certaines associations ne sont pas valides. Vérifiez chaque ingrédient.'
          : 'L’actualisation n’a pas été effectuée. Vos données existantes sont conservées.');
      review.refetch();
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={(next) => { if (!next && !state.isLoading) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-none" />
        <DialogContent className="max-h-[min(85dvh,48rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Actualiser la Fiche process</DialogTitle>
              <InfoTooltip
                label="À propos de l’actualisation de composition"
                content="Comparer les noms et références d’ingrédients modifiés."
              />
            </div>
            <DialogDescription className="sr-only">
              Vérifiez les associations d’ingrédients puis confirmez l’actualisation de la composition.
            </DialogDescription>
          </DialogHeader>

          {(review.isLoading || review.isFetching) && !plan && (
            <p className="py-4 text-sm text-muted-foreground" role="status">
              Comparaison des compositions en cours…
            </p>
          )}
          {review.isError && (
            <div className="mt-4 space-y-3">
              <p className="text-sm" role="alert">
                La comparaison est indisponible. Aucune donnée n’a été modifiée.
              </p>
              <Button type="button" variant="outline" onClick={() => review.refetch()}>
                Réessayer
              </Button>
            </div>
          )}
          {plan?.status === 'CURRENT' && (
            <p className="mt-4 text-sm">Composition déjà à jour.</p>
          )}
          {reasonText[plan?.status] && (
            <div className="mt-4 space-y-3">
              <p className="text-sm">{reasonText[plan.status]}</p>

            </div>
          )}
          {plan?.status === 'REVIEW_REQUIRED' && (
            <div className="mt-5 space-y-4">
              <p className="text-sm">
                Les ingrédients ci-dessous ont changé. Les instructions seront conservées.
              </p>
              {(plan.ingredientChanges ?? []).length > 0 && (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.ingredientChanges.map((change, index) => (
                    <li key={change.type + change.reference + index}>
                      {change.type === 'ADDED' ? 'Ajouté' : 'Retiré'} :
                      {' '}{change.name} ({change.count})
                    </li>
                  ))}
                </ul>
              )}
              {plan.unresolvedCount > 0 && (
                <p className="text-sm font-medium">
                  {plan.unresolvedCount} association(s) à vérifier
                </p>
              )}
              {plan.assignments.filter((item) => !item.proposedTo).map((item) => {
                const choice = Object.hasOwn(choices, item.from)
                  ? choices[item.from] : item.proposedTo;
                return (
                  <div key={item.from} className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center gap-1">
                      <label className="text-sm font-medium" id={'mapping-' + item.from}>
                        {item.name} · occurrence {item.position + 1}
                      </label>
                      <InfoTooltip
                        label={'À propos de la correspondance de ' + item.name}
                        content={item.proposedTo && !Object.hasOwn(choices, item.from)
                          ? 'Correspondance reconnue.'
                          : 'Choisir ou retirer cette association.'}
                      />
                    </div>
                    <Select
                      items={[
                        { value: '__REMOVE__', label: 'Retirer cette association' },
                        ...plan.newIngredients.map((next) => ({
                          value: next.lineKey, label: next.name + ' · occurrence ' + (next.position + 1),
                        })),
                      ]}
                      onValueChange={(value) => {
                        setError('');
                        setChoices((previous) => ({
                          ...previous, [item.from]: value ?? '',
                        }));
                      }}
                      value={choice ?? null}
                    >
                      <SelectTrigger aria-labelledby={'mapping-' + item.from}>
                        <SelectValue placeholder="Choisir la correspondance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__REMOVE__">Retirer cette association</SelectItem>
                        {plan.newIngredients.map((next) => (
                          <SelectItem value={next.lineKey} key={next.lineKey}>
                            {next.name} · occurrence {next.position + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

            </div>
          )}
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={state.isLoading} onClick={onClose}>
              Fermer
            </Button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                disabled={confirmationDisabled}
                onClick={submit}
              >
                {state.isLoading ? 'Actualisation…' : 'Confirmer l’actualisation'}
              </Button>
              <InfoTooltip
                label="Disponibilité de la confirmation d’actualisation"
                content={confirmationHelp}
              />
            </div>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProcessSheetReconciliationDialog };
