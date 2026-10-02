import { useEffect, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateTechnicalSheetMutation,
  useGetTechnicalSheetMetadataQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  basisPointsToInput,
  getTechnicalSheetApiErrorMessage,
  percentInputToBasisPoints,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function TechnicalSheetCreateDialog({
  defaultTargetMarginBasisPoints,
  dossierId,
  onClose,
  onCreated,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productionQuantity, setProductionQuantity] = useState('');
  const [productionUnit, setProductionUnit] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [targetMargin, setTargetMargin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const metadataQuery = useGetTechnicalSheetMetadataQuery(
    { workspaceId, dossierId },
    { skip: !open },
  );
  const [createSheet, createState] = useCreateTechnicalSheetMutation();
  const unitItems = (metadataQuery.data?.units ?? []).map((unit) => ({
    value: unit.value,
    label: unit.label,
  }));

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setProductionQuantity('');
    setProductionUnit('');
    setVatRate('');
    setTargetMargin('');
    setErrorMessage('');
  }, [open]);

  const hasDossierTargetMargin =
    Number.isInteger(defaultTargetMarginBasisPoints);
  const enteredTargetMarginBasisPoints =
    percentInputToBasisPoints(targetMargin);
  const effectiveTargetMarginBasisPoints =
    hasDossierTargetMargin
      ? defaultTargetMarginBasisPoints
      : enteredTargetMarginBasisPoints;
  const targetMarginValid = (
    Number.isInteger(effectiveTargetMarginBasisPoints)
    && effectiveTargetMarginBasisPoints >= 0
    && effectiveTargetMarginBasisPoints < 10000
  );

  async function submit() {
    const normalizedName = name.trim();

    const normalizedQuantity = productionQuantity.trim().replace(',', '.');
    const vatRateBasisPoints = percentInputToBasisPoints(vatRate);

    if (!normalizedName) {
      setErrorMessage('Renseignez le nom de la Fiche technique.');
      return;
    }

    if (
      !/^\d+(?:\.\d+)?$/.test(normalizedQuantity)
      || Number(normalizedQuantity) <= 0
    ) {
      setErrorMessage('Renseignez une quantité produite strictement positive.');
      return;
    }

    if (!productionUnit) {
      setErrorMessage('Sélectionnez l’unité de production.');
      return;
    }

    if (
      vatRateBasisPoints === null
      || vatRateBasisPoints < 0
      || vatRateBasisPoints > 10000
    ) {
      setErrorMessage('Renseignez une TVA comprise entre 0 et 100 %.');
      return;
    }

    if (!targetMarginValid) {
      setErrorMessage('Renseignez une marge cible comprise entre 0 et moins de 100 %.');
      return;
    }

    setErrorMessage('');

    try {
      const result = await createSheet({
        workspaceId,
        dossierId,
        name: normalizedName,
        description: description.trim() || null,
        productionQuantity: normalizedQuantity,
        productionUnit,
        vatRateBasisPoints,
        ...(!hasDossierTargetMargin
          ? {
              targetMarginBasisPoints:
                effectiveTargetMarginBasisPoints,
            }
          : {}),
      }).unwrap();

      onCreated(result);
    } catch (error) {
      setErrorMessage(
        getTechnicalSheetApiErrorMessage(
          error,
          'La Fiche technique n’a pas pu être créée.',
        ),
      );
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !createState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Créer une Fiche technique</DialogTitle>
              <InfoTooltip
                content="La Fiche est créée dans ce Dossier et consomme une unité de capacité du Workspace."
                label="À propos de la création d’une Fiche technique"
              />
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <Field>
              <FieldLabel htmlFor="technical-sheet-name">
                Nom
              </FieldLabel>
              <Input
                disabled={createState.isLoading}
                id="technical-sheet-name"
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Bœuf bourguignon"
                value={name}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="technical-sheet-production-quantity">
                  Quantité produite
                </FieldLabel>
                <Input
                  disabled={createState.isLoading}
                  id="technical-sheet-production-quantity"
                  inputMode="decimal"
                  onChange={(event) => setProductionQuantity(event.target.value)}
                  placeholder="Ex. 10"
                  value={productionQuantity}
                />
              </Field>

              <Field>
                <FieldLabel>Unité de production</FieldLabel>
                <Select
                  disabled={createState.isLoading || metadataQuery.isLoading}
                  items={unitItems}
                  onValueChange={setProductionUnit}
                  value={productionUnit}
                >
                  <SelectTrigger aria-label="Unité de production">
                    <SelectValue placeholder="Choisir une unité" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="technical-sheet-vat">
                  TVA (%)
                </FieldLabel>
                <Input
                  disabled={createState.isLoading}
                  id="technical-sheet-vat"
                  inputMode="decimal"
                  onChange={(event) => setVatRate(event.target.value)}
                  placeholder="Ex. 10"
                  value={vatRate}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="technical-sheet-target-margin">
                  Marge cible (%)
                </FieldLabel>
                {hasDossierTargetMargin ? (
                  <div
                    className="flex h-10 items-center gap-2 rounded-md border border-border bg-muted/20 px-3 text-sm"
                    id="technical-sheet-target-margin"
                  >
                    <span className="font-semibold tabular-nums">
                      {basisPointsToInput(defaultTargetMarginBasisPoints)} %
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Marge du Dossier
                    </span>
                  </div>
                ) : (
                  <>
                    <Input
                      disabled={createState.isLoading}
                      id="technical-sheet-target-margin"
                      inputMode="decimal"
                      onChange={(event) => setTargetMargin(event.target.value)}
                      placeholder="Ex. 30"
                      value={targetMargin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Aucune marge n’est définie dans ce Dossier. Cette valeur sera utilisée pour cette Fiche.
                    </p>
                  </>
                )}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="technical-sheet-description">
                Description
              </FieldLabel>
              <Textarea
                disabled={createState.isLoading}
                id="technical-sheet-description"
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Informations utiles sur la préparation…"
                value={description}
              />
            </Field>

            {errorMessage && (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              disabled={createState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button
              disabled={
                createState.isLoading
                || metadataQuery.isLoading
                || !name.trim()
                || !productionQuantity.trim()
                || !productionUnit
                || !vatRate.trim()
                || !targetMarginValid
              }
              onClick={submit}
              type="button"
            >
              {createState.isLoading ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { TechnicalSheetCreateDialog };
