import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAddressAutocomplete } from '@/features/dossiers/hooks/use-address-autocomplete';
import {
  buildDossierFormDefaults,
  buildDossierFormPayload,
  dossierFormSchema,
} from '@/features/dossiers/validation/dossier-form-schema';

function DossierFormDialog({
  dossier = null,
  mode = 'create',
  onClose,
  onSubmit,
  open,
  pending = false,
}) {
  const editing = mode === 'edit';
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(dossierFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: buildDossierFormDefaults(dossier),
  });

  const addressValue = watch('locationAddress');
  const addressAutocomplete = useAddressAutocomplete(addressValue, {
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    reset(buildDossierFormDefaults(dossier));
  }, [dossier, open, reset]);

  function selectAddressSuggestion(suggestion) {
    setValue('locationAddress', suggestion.address ?? '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('locationPostalCode', suggestion.postalCode ?? '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('locationCity', suggestion.city ?? '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    addressAutocomplete.dismiss(suggestion.address ?? '');
  }

  async function submit(values) {
    try {
      await onSubmit(buildDossierFormPayload(values));
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'L’enregistrement du dossier a échoué.',
      });
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal={pending}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier le dossier' : 'Créer un dossier'}
            </DialogTitle>
            <DialogDescription>
              Seul le nom est obligatoire. Les autres informations peuvent être complétées plus tard.
            </DialogDescription>
          </DialogHeader>

          <form
            className="mt-5 space-y-5"
            id="dossier-form"
            noValidate
            onSubmit={handleSubmit(submit)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                className="sm:col-span-2"
                error={errors.name?.message}
                id="dossier-name"
                label="Nom"
              >
                <Input
                  autoFocus
                  id="dossier-name"
                  maxLength={120}
                  {...register('name')}
                />
              </FormField>

              <FormField
                error={errors.brand?.message}
                id="dossier-brand"
                label="Enseigne"
              >
                <Input id="dossier-brand" maxLength={120} {...register('brand')} />
              </FormField>

              <FormField
                error={errors.contactName?.message}
                id="dossier-contact-name"
                label="Responsable / interlocuteur"
              >
                <Input
                  id="dossier-contact-name"
                  maxLength={160}
                  {...register('contactName')}
                />
              </FormField>

              <div className="relative space-y-2 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="dossier-address">
                  Adresse
                </label>
                <Input
                  aria-describedby={errors.locationAddress ? 'dossier-address-message' : undefined}
                  aria-invalid={Boolean(errors.locationAddress)}
                  autoComplete="street-address"
                  id="dossier-address"
                  maxLength={240}
                  {...register('locationAddress')}
                />
                {errors.locationAddress?.message && (
                  <p
                    className="text-sm font-medium text-destructive"
                    id="dossier-address-message"
                    role="alert"
                  >
                    {errors.locationAddress.message}
                  </p>
                )}
                {addressAutocomplete.isLoading && (
                  <p className="text-xs text-muted-foreground" role="status">
                    Recherche d’adresses…
                  </p>
                )}
                {addressAutocomplete.isError && (
                  <p className="text-xs text-muted-foreground">
                    L’autocomplétion est indisponible. Vous pouvez continuer la saisie manuellement.
                  </p>
                )}
                {addressAutocomplete.suggestions.length > 0 && (
                  <div
                    className="absolute z-[var(--layer-popover)] mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
                    role="listbox"
                  >
                    {addressAutocomplete.suggestions.map((suggestion) => (
                      <button
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        key={suggestion.id}
                        onClick={() => selectAddressSuggestion(suggestion)}
                        role="option"
                        type="button"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                error={errors.locationPostalCode?.message}
                id="dossier-postal-code"
                label="Code postal"
              >
                <Input
                  autoComplete="postal-code"
                  id="dossier-postal-code"
                  maxLength={20}
                  {...register('locationPostalCode')}
                />
              </FormField>

              <FormField
                error={errors.locationCity?.message}
                id="dossier-city"
                label="Ville"
              >
                <Input
                  autoComplete="address-level2"
                  id="dossier-city"
                  maxLength={120}
                  {...register('locationCity')}
                />
              </FormField>

              <FormField
                error={errors.documentEmail?.message}
                id="dossier-document-email"
                label="Email documents"
              >
                <Input
                  autoComplete="email"
                  id="dossier-document-email"
                  maxLength={254}
                  type="email"
                  {...register('documentEmail')}
                />
              </FormField>

              <FormField
                error={errors.phone?.message}
                id="dossier-phone"
                label="Téléphone"
              >
                <Input
                  autoComplete="tel"
                  id="dossier-phone"
                  maxLength={40}
                  type="tel"
                  {...register('phone')}
                />
              </FormField>
            </div>

            {errors.root?.server?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.root.server.message}
              </p>
            )}
          </form>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button disabled={pending} form="dossier-form" type="submit">
              {pending
                ? 'Enregistrement…'
                : editing
                  ? 'Enregistrer'
                  : 'Créer le dossier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { DossierFormDialog };
