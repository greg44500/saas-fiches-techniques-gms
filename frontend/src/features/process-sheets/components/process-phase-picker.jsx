import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  useCreateProcessPhaseTitleMutation,
  useListProcessPhaseTitlesQuery,
} from '@/features/process-sheets/api/process-sheets-api';

// Suggestions are server-owned and Workspace-scoped. Selecting an existing
// title never inserts the model's steps into a process sheet.
function ProcessPhasePicker({
  workspaceId, canReadLibrary = false, disabled = false, onSelect,
  mode = 'create',
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const list = useListProcessPhaseTitlesQuery(
    { workspaceId },
    { skip: !canReadLibrary, refetchOnMountOrArgChange: true },
  );
  const [createTitle, creation] = useCreateProcessPhaseTitleMutation();
  const phases = list.data?.phases ?? [];

  const choose = (value) => {
    if (!value || disabled) return;
    setMenuOpen(false);
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
      <Popover onOpenChange={setMenuOpen} open={menuOpen}>
        <PopoverTrigger
          render={
            <Button
              aria-label={mode === 'create' ? 'Ajouter une phase' : 'Choisir un intitulé de phase'}
              className={mode === 'create' ? 'size-8' : undefined}
              disabled={disabled}
              size={mode === 'create' ? 'icon' : 'sm'}
              type="button"
              variant={mode === 'create' ? 'ghost' : 'outline'}
            />
          }
        >
          {mode === 'create'
            ? <Plus aria-hidden="true" className="size-4" />
            : 'Choisir dans la bibliothèque'}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-label="Phases disponibles"
          className="max-w-[calc(100vw-2rem)] space-y-1"
          sideOffset={8}
        >
          <p className="px-2 pb-1 text-sm font-semibold">Phases disponibles</p>
          {list.isLoading || list.isFetching ? (
            <p role="status" className="px-2 py-2 text-sm text-muted-foreground">
              Chargement des phases…
            </p>
          ) : list.isError ? (
            <p role="alert" className="px-2 py-2 text-sm text-destructive">
              Bibliothèque indisponible
            </p>
          ) : !canReadLibrary ? (
            <p role="status" className="px-2 py-2 text-sm text-muted-foreground">
              Bibliothèque non autorisée
            </p>
          ) : phases.length === 0 ? (
            <p role="status" className="px-2 py-2 text-sm text-muted-foreground">
              Aucune phase disponible
            </p>
          ) : (
            <div aria-label="Intitulés du Workspace" className="max-h-64 space-y-1 overflow-y-auto" role="group">
              {phases.map((phase) => (
                <Button
                  className="h-auto w-full justify-start whitespace-normal text-left"
                  key={phase.id}
                  onClick={() => choose(phase.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {phase.title}
                </Button>
              ))}
            </div>
          )}
          <Button
            className="w-full justify-start border-t border-border"
            onClick={() => choose('other')}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus aria-hidden="true" className="size-4" />
            Autre phase…
          </Button>
        </PopoverContent>
      </Popover>
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
