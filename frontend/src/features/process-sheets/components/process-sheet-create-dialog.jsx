import { useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { ProductVariantField } from '@/features/products/components/product-variant-field';
import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogFooter, DialogHeader, DialogOverlay,
  DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useCreateProcessSheetMutation,
  useListEligibleProcessTechnicalSheetsQuery,
} from '@/features/process-sheets/api/process-sheets-api';

function ProcessSheetCreateDialog({
  dossierId, onClose, onCreated, open, workspaceId,
}) {
  const [title, setTitle] = useState('');
  const [technicalSheetId, setTechnicalSheetId] = useState('');
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const eligible = useListEligibleProcessTechnicalSheetsQuery(
    { workspaceId, dossierId, page, limit: 100 },
    { skip: !open },
  );
  const [createProcess, state] = useCreateProcessSheetMutation();
  const options = eligible.data?.technicalSheets ?? [];
  const selectedIsEligible = options.some((sheet) => sheet.id === technicalSheetId);
  const loadingEligibility = eligible.isLoading || eligible.isFetching;
  const canSubmit = !state.isLoading && !loadingEligibility && !eligible.isError
    && Boolean(title.trim()) && selectedIsEligible;

  async function submit(event) {
    event.preventDefault();
    // Client convenience only; the transactional server check remains authoritative.
    if (state.isLoading || loadingEligibility || eligible.isError) return;
    if (!title.trim() || !selectedIsEligible) {
      setErrorMessage('Renseignez un titre et sélectionnez une Fiche technique.');
      return;
    }
    setErrorMessage('');
    try {
      const created = await createProcess({
        workspaceId, dossierId, title: title.trim(), technicalSheetId,
      }).unwrap();
      onCreated(created);
    } catch (error) {
      if (error?.status === 409) {
        setErrorMessage(
          'Cette Fiche technique n’est plus disponible : elle a pu être modifiée, mise en révision ou liée à une autre Fiche process.',
        );
        setTechnicalSheetId('');
        eligible.refetch();
      } else {
        setErrorMessage(
          error?.data?.message ?? 'La Fiche process n’a pas pu être créée.',
        );
      }
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(next) => { if (!next && !state.isLoading) onClose(); }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Créer une Fiche process</DialogTitle>
              <InfoTooltip
                label="À propos de la création d’une Fiche process"
                content="Chaque Fiche process est liée à une seule Fiche technique validée. Un second process sur la même Fiche est interdit."
              />
            </div>
          </DialogHeader>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <ProductVariantField
              filled={Boolean(title.trim())}
              floating
              helpContent="Nommez votre procédure de fabrication. Ce titre peut différer du nom de la Fiche technique."
              helpLabel="À propos du titre de la Fiche process"
              id="process-sheet-title"
              label="Titre de la Fiche process"
            >
              <Input
                className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground"
                id="process-sheet-title"
                maxLength={160}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setErrorMessage('');
                }}
                placeholder="Ex. Fabrication de la tartine auvergnate"
                required
                value={title}
              />
            </ProductVariantField>
            <ProductVariantField
              filled={Boolean(technicalSheetId)}
              floating
              helpContent="Seules les Fiches actives, validées, sans brouillon de révision ouvert et sans Fiche process associée sont disponibles dans ce Dossier."
              helpLabel="Critères de disponibilité des Fiches techniques"
              id="process-sheet-linked"
              label="Fiche technique associée"
              unavailable={loadingEligibility || eligible.isError || options.length === 0}
            >
              {eligible.isError ? (
                <ErrorState
                  title="Sélection indisponible"
                  description="La liste des Fiches techniques éligibles n’a pas pu être chargée."
                  onRetry={eligible.refetch}
                />
              ) : (
                <>
                  <Select
                    disabled={loadingEligibility || eligible.isError || options.length === 0}
                    items={options.map((sheet) => ({
                      value: sheet.id, label: sheet.name,
                    }))}
                    onValueChange={(nextValue) => {
                      setTechnicalSheetId(nextValue || '');
                      setErrorMessage('');
                    }}
                    value={technicalSheetId || null}
                  >
                    <SelectTrigger
                      aria-label="Fiche technique associée"
                      className="h-12 pt-3"
                      id="process-sheet-linked"
                    >
                      <SelectValue
                        className={!technicalSheetId
                          ? 'opacity-0 transition-opacity duration-200 group-focus-within:opacity-100'
                          : undefined}
                        placeholder="Sélectionner une Fiche technique"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {eligible.isFetching && !eligible.isLoading && (
                    <p role="status" className="text-xs text-muted-foreground">
                      Actualisation des Fiches techniques éligibles…
                    </p>
                  )}
                  {!loadingEligibility && options.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucune Fiche technique éligible. Les Fiches en brouillon,
                      en révision ou déjà liées à un process ne peuvent pas
                      être sélectionnées. Une validation M-004 sans brouillon
                      ouvert est nécessaire.
                    </p>
                  )}
                  {(eligible.data?.pagination?.totalPages ?? 0) > 1 && (
                    <DataPagination
                      disabled={eligible.isFetching}
                      onPageChange={(next) => {
                        setPage(next);
                        setTechnicalSheetId('');
                      }}
                      page={page}
                      pagination={eligible.data?.pagination}
                    />
                  )}
                </>
              )}
            </ProductVariantField>
            {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
            <DialogFooter>
              <Button disabled={state.isLoading} onClick={onClose} type="button" variant="outline">
                Annuler
              </Button>
              <Button
                disabled={!canSubmit}
                type="submit"
              >
                {state.isLoading ? 'Création…' : 'Créer et ouvrir'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProcessSheetCreateDialog };
