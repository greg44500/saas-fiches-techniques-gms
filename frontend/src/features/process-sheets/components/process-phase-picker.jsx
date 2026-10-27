import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useCreateProcessPhaseTitleMutation,
  useListProcessPhaseTitlesQuery,
} from '@/features/process-sheets/api/process-sheets-api';

const EMPTY_PHASES = [];

// Suggestions are server-owned and Workspace-scoped. Selecting an existing
// title never inserts the model's steps into a process sheet.
function ProcessPhasePicker({
  workspaceId, canReadLibrary = false, disabled = false, onSelect,
  mode = 'create',
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const list = useListProcessPhaseTitlesQuery(
    { workspaceId },
    { skip: !canReadLibrary, refetchOnMountOrArgChange: true },
  );
  const [createTitle, creation] = useCreateProcessPhaseTitleMutation();
  const phases = list.data?.phases ?? EMPTY_PHASES;
  // Keep Base UI's item collection stable while its popup opens.
  const options = useMemo(() => [
    ...phases.map((phase) => ({ value: phase.id, label: phase.title })),
    { value: 'other', label: 'Autre phase…' },
  ], [phases]);

  const choose = (value) => {
    if (!value || disabled) return;
    if (value === 'other') {
      setErrorMessage('');
      setTitle('');
      setDialogOpen(true);
      return;
    }
    const selected = phases.find((phase) => phase.id === value);
    if (selected) onSelect(selected.title);
  };

  const submit = async (event) => {
    event.preventDefault();
    const name = title.trim().replace(/\s+/g, ' ');
    if (!name || disabled || creation.isLoading) return;
    setErrorMessage('');
    try {
      const created = await createTitle({ workspaceId, title: name }).unwrap();
      onSelect(created.title);
      setDialogOpen(false);
      setTitle('');
    } catch (error) {
      setErrorMessage(error?.status === 409
        ? 'Cet intitulé existe déjà dans le Workspace. Choisissez-le dans la liste.'
        : error?.data?.message ?? 'Impossible d’enregistrer ce nouvel intitulé.');
    }
  };

  return (
    <>
      <Select
        disabled={disabled}
        items={options}
        onValueChange={choose}
        value={null}
      >
        <SelectTrigger
          aria-label={mode === 'create' ? 'Ajouter une phase' : 'Choisir un intitulé de phase'}
          className={mode === 'create' ? 'size-8 justify-center border-0 px-1 hover:bg-muted [&_[data-slot=select-value]]:hidden' : 'w-fit max-w-full'}
        >
          {mode === 'create' ? (
            <>
              <Plus aria-hidden="true" className="size-4" />
              <SelectValue className="sr-only" placeholder="Ajouter une phase" />
            </>
          ) : <SelectValue placeholder="Choisir dans la bibliothèque" />}
        </SelectTrigger>
        <SelectContent>
          {list.isLoading || list.isFetching ? (
            <p role="status" className="px-3 py-2 text-sm text-muted-foreground">Chargement des phases…</p>
          ) : list.isError ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">Bibliothèque indisponible</p>
          ) : !canReadLibrary ? (
            <p role="status" className="px-3 py-2 text-sm text-muted-foreground">Bibliothèque non autorisée</p>
          ) : phases.length === 0 ? (
            <p role="status" className="px-3 py-2 text-sm text-muted-foreground">Aucune phase disponible</p>
          ) : phases.map((phase) => (
            <SelectItem key={phase.id} value={phase.id}>{phase.title}</SelectItem>
          ))}
          <SelectItem value="other">Autre phase…</SelectItem>
        </SelectContent>
      </Select>
      <DialogRoot
        disablePointerDismissal
        onOpenChange={(next) => {
          if (!next && !creation.isLoading) setDialogOpen(false);
        }}
        open={dialogOpen}
      >
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel intitulé de phase</DialogTitle>
              <DialogDescription>
                Cet intitulé sera disponible dans tous les Dossiers de ce Workspace.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <label className="grid gap-2 text-sm" htmlFor="process-phase-custom-title">
                Intitulé
                <Input
                  autoFocus
                  disabled={creation.isLoading}
                  id="process-phase-custom-title"
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  value={title}
                />
              </label>
              {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
              <DialogFooter>
                <Button disabled={creation.isLoading} onClick={() => setDialogOpen(false)}
                  type="button" variant="outline">Annuler</Button>
                <Button disabled={!title.trim() || creation.isLoading} type="submit">
                  {creation.isLoading ? 'Enregistrement…' : 'Ajouter la phase'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

export { ProcessPhasePicker };
