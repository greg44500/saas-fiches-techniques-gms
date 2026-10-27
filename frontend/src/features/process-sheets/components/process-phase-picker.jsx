import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  useListDossierPhaseTemplatesQuery,
  useListWorkspacePhaseTemplatesQuery,
} from '@/features/process-sheets/api/process-sheets-api';

// Read-only title suggestions from both M-006 backend libraries.
// Choosing a title deliberately does not adopt a template's instructions/steps.
function ProcessPhasePicker({
  workspaceId, dossierId, canReadLibrary = false, disabled = false,
  onSelect, mode = 'create',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = {
    workspaceId, dossierId, page, limit: 100, search: search.trim() || undefined,
  };
  const skip = !open || !canReadLibrary;
  const local = useListDossierPhaseTemplatesQuery(query, {
    skip, refetchOnMountOrArgChange: true,
  });
  const common = useListWorkspacePhaseTemplatesQuery(query, {
    skip, refetchOnMountOrArgChange: true,
  });
  const loading = canReadLibrary && (
    local.isLoading || common.isLoading || local.isFetching || common.isFetching
  );
  const all = loading ? [] : [
    ...((local.currentData ?? local.data)?.templates ?? []).map((template) => ({
      ...template, scope: 'Dossier',
    })),
    ...((common.currentData ?? common.data)?.templates ?? []).map((template) => ({
      ...template, scope: 'Workspace',
    })),
  ];
  const failed = canReadLibrary && (local.isError || common.isError);
  const totalPages = Math.max(
    local.data?.pagination?.totalPages ?? 0,
    common.data?.pagination?.totalPages ?? 0,
  );

  const choose = (title) => {
    onSelect(title);
    setOpen(false);
    setSearch('');
    setPage(1);
  };

  const triggerName = mode === 'create' ? 'Ajouter une phase' : 'Choisir un intitulé de phase';
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={triggerName}
            className={mode === 'create' ? 'size-8' : undefined}
            disabled={disabled}
            size={mode === 'create' ? 'icon' : 'sm'}
            type="button"
            variant={mode === 'create' ? 'ghost' : 'outline'}
          />
        }
      >
        {mode === 'create' ? <Plus aria-hidden="true" className="size-4" /> : (
          <>
            Choisir dans la bibliothèque
            <ChevronDown aria-hidden="true" className="size-4" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] space-y-2" sideOffset={8}>
        <p className="text-sm font-semibold">Phases disponibles</p>
        <p className="text-xs text-muted-foreground">
          Seul l’intitulé est repris, sans ajouter les étapes du modèle.
        </p>
        {canReadLibrary ? (
          <>
            <Input
              aria-label="Rechercher une phase"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher une phase…"
              value={search}
            />
            {loading && <p className="text-sm text-muted-foreground" role="status">Chargement des phases…</p>}
            {failed && (
              <p className="text-sm text-destructive" role="alert">
                Une bibliothèque de phases est indisponible.
              </p>
            )}
            <div className="max-h-64 space-y-1 overflow-y-auto" role="list" aria-label="Propositions de phases">
              {all.map((template) => (
                <div key={template.scope + ':' + template.id} role="listitem">
                  <Button
                    className="h-auto w-full justify-between whitespace-normal py-2 text-left"
                    onClick={() => choose(template.title)}
                    type="button"
                    variant="ghost"
                  >
                    <span className="min-w-0 break-words">{template.title}</span>
                    <span className="shrink-0 text-xs font-normal text-muted-foreground">{template.scope}</span>
                  </Button>
                </div>
              ))}
            </div>
            {!loading && !failed && all.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun modèle actif ne correspond à cette recherche.
              </p>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button disabled={page <= 1} onClick={() => setPage(page - 1)}
                  size="sm" type="button" variant="outline">Précédent</Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                  size="sm" type="button" variant="outline">Suivant</Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            La consultation des modèles de phases n’est pas autorisée pour ce rôle.
          </p>
        )}
        {mode === 'create' && (
          <Button className="w-full justify-start border-t border-border" onClick={() => choose('Nouvelle phase')}
            size="sm" type="button" variant="ghost">
            <Plus aria-hidden="true" className="size-4" />
            Autre phase (intitulé libre)
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { ProcessPhasePicker };
