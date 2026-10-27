import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ProductVariantField } from '@/features/products/components/product-variant-field';

const DURATION_FIELDS = [
  { key: 'activeMinutes', label: 'Temps actif (min)', placeholder: 'Ex. 15' },
  { key: 'restMinutes', label: 'Repos / attente (min)', placeholder: 'Ex. 30' },
  { key: 'treatmentMinutes', label: 'Cuisson / traitement (min)', placeholder: 'Ex. 45' },
];
const TIME_TITLE = 'Temps, température et équipements';
const QUALITY_TITLE = 'Vigilance, qualité et maîtrise sanitaire';

function OutlinedDetailInput({
  id, label, ariaLabel, disabled, value, onChange, placeholder,
  type = 'text', min, max, step, maxLength, className,
}) {
  return (
    <ProductVariantField className={className} filled={String(value ?? '') !== ''}
      floating id={id} label={label}>
      <Input
        aria-label={ariaLabel}
        className="h-12 placeholder:text-transparent focus:placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={disabled} id={id} max={max} maxLength={maxLength} min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder} step={step} type={type} value={value ?? ''}
      />
    </ProductVariantField>
  );
}

function StringListFields({ idPrefix, title, placeholder, items, disabled, onChange }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{title}</legend>
      {items.map((item, index) => (
        <div className="flex items-center gap-2" key={index}>
          <OutlinedDetailInput
            ariaLabel={title + ' ' + (index + 1)}
            className="min-w-0 flex-1"
            disabled={disabled}
            id={idPrefix + '-' + index}
            label={title + ' ' + (index + 1)}
            maxLength={1000}
            onChange={(value) => onChange(items.map((old, i) => i === index ? value : old))}
            placeholder={placeholder}
            value={item}
          />
          {!disabled && (
            <Button aria-label={'Supprimer ' + title + ' ' + (index + 1)}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              size="sm" type="button" variant="ghost">
              Supprimer
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button disabled={items.length >= 30}
          onClick={() => onChange([...items, ''])} size="sm" type="button" variant="outline">
          Ajouter
        </Button>
      )}
    </fieldset>
  );
}

function ControlFields({ idPrefix, title, controls, disabled, onChange }) {
  const fields = [
    { key: 'instruction', label: 'Instruction', placeholder: 'Ex. Vérifier le résultat' },
    { key: 'expectedCriterion', label: 'Critère attendu', placeholder: 'Ex. Résultat conforme' },
    { key: 'correctiveAction', label: 'Mesure corrective', placeholder: 'Ex. Corriger avant de poursuivre' },
  ];
  return (
    <fieldset className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="text-sm font-medium">{title}</legend>
        {!disabled && (
          <Button disabled={controls.length >= 30}
            onClick={() => onChange([...controls, { instruction: '' }])}
            size="sm" type="button" variant="outline">
            Ajouter un contrôle
          </Button>
        )}
      </div>
      {controls.map((control, index) => (
        <div className="space-y-3 rounded-md border border-border p-3" key={index}>
          <p className="text-xs font-medium text-muted-foreground">Contrôle {index + 1}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder }) => (
              <OutlinedDetailInput
                ariaLabel={title + ' ' + label + ' ' + (index + 1)}
                className={key === 'instruction' ? 'sm:col-span-2' : undefined}
                disabled={disabled}
                id={idPrefix + '-' + index + '-' + key}
                key={key}
                label={label}
                maxLength={1000}
                onChange={(value) => onChange(controls.map((old, i) => i === index
                  ? { ...old, [key]: value } : old))}
                placeholder={placeholder}
                value={control[key] ?? ''}
              />
            ))}
          </div>
          {!disabled && (
            <Button onClick={() => onChange(controls.filter((_, i) => i !== index))}
              size="sm" type="button" variant="ghost">
              Supprimer ce contrôle
            </Button>
          )}
        </div>
      ))}
    </fieldset>
  );
}

function snapshot(step, kind) {
  if (kind === 'times') {
    return {
      duration: Object.fromEntries(DURATION_FIELDS.map(({ key }) =>
        [key, String(step.duration?.[key] ?? '')])),
      temperatureCelsius: String(step.temperatureCelsius ?? ''),
      equipment: [...(step.equipment ?? [])],
    };
  }
  return {
    manufacturingVigilance: [...(step.manufacturingVigilance ?? [])],
    qualityControls: (step.qualityControls ?? []).map((item) => ({ ...item })),
    sanitaryControls: (step.sanitaryControls ?? []).map((item) => ({ ...item })),
  };
}

function hasTimes(step) {
  return Object.values(step.duration ?? {}).some((value) => value != null)
    || step.temperatureCelsius != null || Boolean(step.equipment?.length);
}

function hasQuality(step) {
  return Boolean(step.manufacturingVigilance?.length)
    || Boolean(step.qualityControls?.length) || Boolean(step.sanitaryControls?.length);
}

function ProcessStepDetails({ step, disabled, onChange }) {
  const [kind, setKind] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');

  const open = (nextKind) => {
    setDraft(snapshot(step, nextKind));
    setError('');
    setKind(nextKind);
  };
  const close = () => {
    setKind(null);
    setDraft(null);
    setError('');
  };
  const change = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError('');
  };
  const submit = (event) => {
    event.preventDefault();
    if (disabled || !draft) return;
    if (kind === 'times') {
      const duration = {};
      for (const { key } of DURATION_FIELDS) {
        const raw = draft.duration[key];
        if (raw === '') continue;
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 0 || value > 10080) {
          setError('Les durées doivent être des minutes entières entre 0 et 10080.');
          return;
        }
        duration[key] = value;
      }
      const rawTemperature = draft.temperatureCelsius;
      const temperature = rawTemperature === '' ? null : Number(rawTemperature);
      if (temperature != null && (!Number.isFinite(temperature)
        || temperature < -100 || temperature > 350
        || Math.abs(temperature * 10 - Math.round(temperature * 10)) > 1e-7)) {
        setError('La température doit être comprise entre -100 et 350 °C, au dixième près.');
        return;
      }
      onChange({ ...step, duration, temperatureCelsius: temperature, equipment: draft.equipment });
    } else {
      onChange({
        ...step, manufacturingVigilance: draft.manufacturingVigilance,
        qualityControls: draft.qualityControls, sanitaryControls: draft.sanitaryControls,
      });
    }
    close();
  };

  const title = kind === 'times' ? TIME_TITLE : QUALITY_TITLE;
  return (
    <>
      <div className="grid gap-2 border-t border-border/70 pt-3 sm:grid-cols-2">
        <Button className="h-auto min-h-12 w-full justify-between gap-2 whitespace-normal py-2 text-left"
          onClick={() => open('times')} size="sm" type="button" variant="outline">
          <span>{TIME_TITLE}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {hasTimes(step) ? 'Renseignés' : 'Facultatifs'}
          </span>
        </Button>
        <Button className="h-auto min-h-12 w-full justify-between gap-2 whitespace-normal py-2 text-left"
          onClick={() => open('quality')} size="sm" type="button" variant="outline">
          <span>{QUALITY_TITLE}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {hasQuality(step) ? 'Renseignés' : 'Facultatifs'}
          </span>
        </Button>
      </div>
      <DialogRoot disablePointerDismissal onOpenChange={(next) => { if (!next) close(); }}
        open={Boolean(kind)}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent className="flex max-h-[min(90dvh,52rem)] max-w-2xl flex-col">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Informations facultatives de l’étape. Les changements sont appliqués au brouillon
                et seront enregistrés avec celui-ci.
              </DialogDescription>
            </DialogHeader>
            {draft && (
              <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-3 pr-1">
                  {kind === 'times' ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {DURATION_FIELDS.map(({ key, label, placeholder }) => (
                          <OutlinedDetailInput
                            disabled={disabled} id={'step-' + step.id + '-' + key}
                            key={key} label={label} max={10080} min={0}
                            onChange={(value) => change('duration', { ...draft.duration, [key]: value })}
                            placeholder={placeholder} step={1} type="number"
                            value={draft.duration[key]}
                          />
                        ))}
                      </div>
                      <OutlinedDetailInput
                        className="max-w-44" disabled={disabled}
                        id={'step-' + step.id + '-temperature'}
                        label="Température (°C)" max={350} min={-100}
                        onChange={(value) => change('temperatureCelsius', value)}
                        placeholder="Ex. 180" step={0.1} type="number"
                        value={draft.temperatureCelsius}
                      />
                      <StringListFields disabled={disabled} idPrefix={'step-' + step.id + '-equipment'}
                        items={draft.equipment} onChange={(items) => change('equipment', items)}
                        placeholder="Ex. Four ventilé" title="Équipements" />
                    </>
                  ) : (
                    <>
                      <StringListFields disabled={disabled} idPrefix={'step-' + step.id + '-vigilance'}
                        items={draft.manufacturingVigilance}
                        onChange={(items) => change('manufacturingVigilance', items)}
                        placeholder="Ex. Surveiller la texture" title="Points de vigilance" />
                      <ControlFields controls={draft.qualityControls} disabled={disabled}
                        idPrefix={'step-' + step.id + '-quality'} title="Qualité"
                        onChange={(items) => change('qualityControls', items)} />
                      <ControlFields controls={draft.sanitaryControls} disabled={disabled}
                        idPrefix={'step-' + step.id + '-sanitary'} title="Maîtrise sanitaire"
                        onChange={(items) => change('sanitaryControls', items)} />
                    </>
                  )}
                  {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                </div>
                <DialogFooter>
                  <Button onClick={close} type="button" variant="outline">
                    {disabled ? 'Fermer' : 'Annuler'}
                  </Button>
                  {!disabled && <Button type="submit">Valider</Button>}
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

export { ProcessStepDetails };
