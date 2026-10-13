import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogOverlay, DialogPortal, DialogRoot,
  DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  useCreateGlobalSupplierMutation, useCreateSupplierMutation,
  useListGlobalSuppliersQuery, useListSuppliersQuery,
} from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

const NONE = '__NONE__';

function SupplierImportSelector({
  mode = 'workspace', onChange, suppliers = [], value, workspaceId,
  canCreate = false, label = 'Fournisseur',
  ariaLabel = 'Fournisseur',
}) {
  const global = mode === 'global';
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState([]);
  const [createWorkspace, workspaceState] = useCreateSupplierMutation();
  const [createGlobal, globalState] = useCreateGlobalSupplierMutation();
  const queryArgs = { status: 'ACTIVE', search: search.trim() || undefined, limit: 100 };
  const workspaceQuery = useListSuppliersQuery(
    { ...queryArgs, workspaceId },
    { skip: global || !workspaceId },
  );
  const globalQuery = useListGlobalSuppliersQuery(
    queryArgs, { skip: !global },
  );
  const query = global ? globalQuery : workspaceQuery;
  const pending = workspaceState.isLoading || globalState.isLoading;
  const found = query.data?.suppliers ?? [];
  const options = [...created, ...found, ...suppliers]
    .filter((supplier, index, all) =>
      all.findIndex((candidate) => candidate.id === supplier.id) === index)
    .filter((supplier) => !search.trim() ||
      supplier.name.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')));
  const selected = [...created, ...found, ...suppliers].find((item) => item.id === value);
  const mayCreate = canCreate && (global || Boolean(workspaceId));

  async function create(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Indiquez le nom du Fournisseur.');
      return;
    }
    try {
      // Alerter plutôt que fusionner des homonymes : l'identité ne se réduit pas au nom.
      const match = options.find((supplier) =>
        supplier.name.trim().toLocaleLowerCase('fr') === trimmed.toLocaleLowerCase('fr'));
      if (match) {
        setError('Un Fournisseur de ce nom est déjà proposé. Sélectionnez-le ou précisez le nom.');
        return;
      }
      const supplier = global
        ? await createGlobal({ name: trimmed }).unwrap()
        : await createWorkspace({ workspaceId, name: trimmed }).unwrap();
      setCreated((current) => [supplier, ...current]);
      onChange(supplier.id);
      setSearch('');
      setCreating(false);
      setName('');
      setError('');
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Création du Fournisseur impossible.'));
    }
  }

  return (
    <>
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <Input
          aria-label={'Rechercher un Fournisseur'}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher par nom…"
          value={search}
        />
        <div aria-label={ariaLabel} className="max-h-44 overflow-y-auto rounded-md border border-border" role="group">
          {selected && !options.some((item) => item.id === selected.id) && (
            <Button className="w-full justify-start" onClick={() => onChange(selected.id)} type="button" variant="ghost">
              {selected.name} (sélectionné)
            </Button>
          )}
          {options.map((supplier) => (
            <Button
              aria-pressed={value === supplier.id}
              className="w-full justify-start whitespace-normal text-left"
              key={supplier.id}
              onClick={() => onChange(supplier.id)}
              type="button"
              variant={value === supplier.id ? 'secondary' : 'ghost'}
            >
              {supplier.name}{value === supplier.id ? ' (sélectionné)' : ''}
            </Button>
          ))}
          {query.isFetching && <p className="p-2 text-sm text-muted-foreground">Recherche…</p>}
          {!query.isFetching && options.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">Aucun Fournisseur trouvé.</p>
          )}
          {(query.data?.pagination?.totalPages ?? 1) > 1 && (
            <p className="p-2 text-xs text-muted-foreground">
              Affinez la recherche pour retrouver les autres Fournisseurs.
            </p>
          )}
          {query.isError && (
            <p className="p-2 text-sm text-destructive">Recherche indisponible. Réessayez.</p>
          )}
        </div>
        {mayCreate && (
          <Button onClick={() => { setName(search); setError(''); setCreating(true); }}
            type="button" variant="outline">
            Créer un nouveau Fournisseur
          </Button>
        )}
      </Field>
      <DialogRoot open={creating} onOpenChange={(open) => { if (!pending) setCreating(open); }}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Création rapide d’un Fournisseur</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Seul le nom est nécessaire. Vous pourrez compléter la fiche dans le référentiel Fournisseurs.
              {global ? ' Ce Fournisseur sera partagé.' : ' Ce Fournisseur restera propre à cet espace de travail.'}
            </p>
            <form className="space-y-4" onSubmit={create}>
              <Field>
                <FieldLabel htmlFor="quick-supplier-name">Nom du Fournisseur</FieldLabel>
                <Input autoFocus id="quick-supplier-name" maxLength={160}
                  onChange={(event) => setName(event.target.value)} value={name} />
              </Field>
              <FieldError>{error}</FieldError>
              <DialogFooter>
                <Button disabled={pending} onClick={() => setCreating(false)}
                  type="button" variant="outline">Annuler</Button>
                <Button disabled={pending || !name.trim()} type="submit">
                  {pending ? 'Création…' : 'Créer et sélectionner'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

export { SupplierImportSelector };
