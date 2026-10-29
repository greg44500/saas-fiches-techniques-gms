import { useState } from 'react';
import { Eye, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useDeleteProcessSheetMutation, useGetProcessSheetQuery,
} from '@/features/process-sheets/api/process-sheets-api';
import { ProcessSheetPreview } from '@/features/process-sheets/components/process-sheet-preview';

function ProcessSheetRowActions({ dossierId, workspaceId, process, onOpen, canDelete = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [removeProcess, removal] = useDeleteProcessSheetMutation();
  const detail = useGetProcessSheetQuery(
    { workspaceId, dossierId, processSheetId: process.id },
    { skip: !previewOpen },
  );

  const openPreview = () => {
    setMenuOpen(false);
    setPreviewOpen(true);
  };

  const confirmDelete = async () => {
    if (!canDelete || removal.isLoading) return;
    setDeleteError('');
    try {
      await removeProcess({
        workspaceId, dossierId, processSheetId: process.id,
        expectedRevision: process.revision,
      }).unwrap();
      setDeleteOpen(false);
    } catch (error) {
      setDeleteError(error?.data?.code === 'PROCESS_SHEET_DELETE_CONFLICT'
        ? 'La Fiche process a changé. Actualisez la liste avant de réessayer.'
        : 'Suppression impossible. La Fiche process n’a pas été supprimée.');
    }
  };

  return (
    <>
      <Popover onOpenChange={setMenuOpen} open={menuOpen}>
        <PopoverTrigger render={(
          <Button
            aria-label={'Actions de la Fiche process ' + process.title}
            size="icon" type="button" variant="outline"
          />
        )}>
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-label={'Actions de la Fiche process ' + process.title}
          className="w-52 space-y-1"
        >
          <Button className="w-full justify-start" onClick={() => {
            setMenuOpen(false);
            onOpen();
          }} size="sm" type="button" variant="ghost">
            <FolderOpen aria-hidden="true" className="size-4" />
            Ouvrir
          </Button>
          <Button className="w-full justify-start" onClick={openPreview}
            size="sm" type="button" variant="ghost">
            <Eye aria-hidden="true" className="size-4" />
            Prévisualiser
          </Button>
          <Button
            className="w-full justify-start text-destructive"
            disabled={!canDelete}
            onClick={() => { setMenuOpen(false); setDeleteError(''); setDeleteOpen(true); }}
            size="sm"
            title={!canDelete ? 'Suppression non autorisée ou Fiche technique inactive' : undefined}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Supprimer
          </Button>
        </PopoverContent>
      </Popover>
      <DialogRoot onOpenChange={(open) => { if (!open && !removal.isLoading) setDeleteOpen(false); }}
        open={deleteOpen}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer définitivement cette Fiche process ?</DialogTitle>
              <DialogDescription>
                La Fiche process « {process.title} » et toutes ses phases et étapes seront
                supprimées définitivement. Cette action est irréversible.
                La Fiche technique associée sera conservée.
              </DialogDescription>
            </DialogHeader>
            {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
            <DialogFooter>
              <Button disabled={removal.isLoading} onClick={() => setDeleteOpen(false)}
                type="button" variant="outline">Annuler</Button>
              <Button disabled={removal.isLoading || !canDelete} onClick={confirmDelete}
                type="button" variant="destructive">
                {removal.isLoading ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
      <DialogRoot onOpenChange={(next) => { if (!next) setPreviewOpen(false); }}
        open={previewOpen}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col">
            <DialogHeader>
              <DialogTitle>Prévisualiser : {process.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Consultation du brouillon enregistré sans modification.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto py-3">
              {detail.isLoading || (detail.isFetching && !detail.data) ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Chargement de l’aperçu…
                </p>
              ) : detail.isError || !detail.data?.draft ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive" role="alert">
                    Impossible de charger l’aperçu de cette Fiche process.
                  </p>
                  <Button onClick={() => detail.refetch()} size="sm" type="button" variant="outline">
                    Réessayer
                  </Button>
                </div>
              ) : (
                <ProcessSheetPreview
                  ingredients={detail.data.sourceIngredients?.lines ?? []}
                  phases={detail.data.draft.phases ?? []}
                />
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setPreviewOpen(false)} type="button" variant="outline">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

export { ProcessSheetRowActions };
