import { useState } from 'react';
import { Eye, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGetProcessSheetQuery } from '@/features/process-sheets/api/process-sheets-api';
import { ProcessSheetPreview } from '@/features/process-sheets/components/process-sheet-preview';

function ProcessSheetRowActions({ dossierId, workspaceId, process, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const detail = useGetProcessSheetQuery(
    { workspaceId, dossierId, processSheetId: process.id },
    { skip: !previewOpen },
  );

  const openPreview = () => {
    setMenuOpen(false);
    setPreviewOpen(true);
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
            disabled
            size="sm"
            title="La suppression définitive n’est pas encore disponible"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Supprimer
          </Button>
          <p className="px-2 text-xs text-muted-foreground">
            Suppression indisponible pour le moment.
          </p>
        </PopoverContent>
      </Popover>
      <DialogRoot onOpenChange={(next) => { if (!next) setPreviewOpen(false); }}
        open={previewOpen}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-none" />
          <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col">
            <DialogHeader>
              <DialogTitle>Prévisualiser : {process.title}</DialogTitle>
              <DialogDescription>
                Aperçu en lecture seule de la dernière version enregistrée du brouillon.
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
                  description="Aperçu du brouillon enregistré. Cette consultation ne modifie ni ne valide la Fiche process."
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
