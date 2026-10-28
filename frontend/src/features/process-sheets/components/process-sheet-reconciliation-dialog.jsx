import { useEffect, useState } from 'react';
import { Link } from 'react-router';

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
  PARENT_REVISION_OPEN: 'Une modification de la Fiche technique est encore en cours. Terminez-la ou abandonnez-la avant de continuer.',
  PARENT_UNAVAILABLE: 'La Fiche technique doit être active et validée pour poursuivre.',
  REFERENCE_UNAVAILABLE: 'Une composition officielle nécessaire à la comparaison est indisponible. Contactez un responsable.',
};

function ProcessSheetReconciliationDialog({
  canApply, dossierId, onClose, onUpdated, open, processSheetId,
  technicalSheetId, workspaceId,
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
  const technicalSheetPath = '/workspaces/' + workspaceId + '/dossiers/' + dossierId
    + '/technical-sheets/' + technicalSheetId;

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
            <DialogTitle>Actualiser la Fiche process</DialogTitle>
            <DialogDescription>
              Comparer la Fiche technique validée avec la composition utilisée
              par cette Fiche process. Vos phases et instructions sont conservées.
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
            <p className="mt-4 text-sm">Cette Fiche process utilise déjà la composition officielle courante.</p>
          )}
          {reasonText[plan?.status] && (
            <div className="mt-4 space-y-3">
              <p className="text-sm">{reasonText[plan.status]}</p>
              {plan.status === 'PARENT_REVISION_OPEN' && (
                <Button asChild variant="outline" type="button">
                  <Link to={technicalSheetPath}>Ouvrir la Fiche technique</Link>
                </Button>
              )}
            </div>
          )}
          {plan?.status === 'REVIEW_REQUIRED' && (
            <div className="mt-5 space-y-4">
              <p className="text-sm">
                {plan.compositionChanged
                  ? 'La recette a changé. Vérifiez les associations ci-dessous avant de valider de nouveau la fabrication.'
                  : 'La recette de fabrication est identique. Seule la référence officielle doit être actualisée.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {plan.oldIngredientCount} ingrédients dans l’ancienne composition,
                {' '}{plan.newIngredients.length} dans la nouvelle.
                {' '}{plan.unresolvedCount} association(s) sans correspondance certaine.
              </p>
              {plan.assignments.map((item) => {
                const choice = Object.hasOwn(choices, item.from)
                  ? choices[item.from] : item.proposedTo;
                return (
                  <div key={item.from} className="space-y-2 border-t border-border pt-3">
                    <label className="block text-sm font-medium" id={'mapping-' + item.from}>
                      {item.name} · occurrence {item.position + 1}
                    </label>
                    {item.proposedTo && !Object.hasOwn(choices, item.from) ? (
                      <p className="text-xs text-muted-foreground">
                        Correspondance identifiée. Vous pouvez la modifier.
                      </p>
                    ) : null}
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
              {!canApply && (
                <p className="text-sm text-muted-foreground">
                  Enregistrez les modifications locales et vérifiez vos droits
                  d’édition et de validation avant d’actualiser.
                </p>
              )}
              {duplicateTargets && (
                <p className="text-sm text-muted-foreground" role="status">
                  Deux anciennes associations pointent vers la même nouvelle occurrence.
                  Sélectionnez des occurrences distinctes.
                </p>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={state.isLoading} onClick={onClose}>
              Fermer
            </Button>
            {plan?.status === 'REVIEW_REQUIRED' && (
              <Button
                type="button"
                disabled={!canApply || Boolean(outstanding.length) || invalid
                  || duplicateTargets || state.isLoading || review.isFetching || review.isError}
                onClick={submit}
              >
                {state.isLoading ? 'Actualisation…' : 'Confirmer l’actualisation'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProcessSheetReconciliationDialog };
