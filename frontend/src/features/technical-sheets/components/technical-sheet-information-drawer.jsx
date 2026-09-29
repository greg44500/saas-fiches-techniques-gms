import { PanelRightOpen, Save } from 'lucide-react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  TechnicalSheetHistory,
} from '@/features/technical-sheets/components/technical-sheet-history';
import { cn } from '@/lib/utils';

function TechnicalSheetInformationDrawer({
  canEdit,
  canValidate,
  description,
  dirty,
  history = [],
  historyLoading = false,
  name,
  onClose,
  onDescriptionChange,
  onNameChange,
  onOpen,
  onSave,
  onValidationCommentChange,
  open,
  pending,
  showValidationComment,
  validationComment,
}) {
  return (
    <>
      {!open && (
        <Button
          aria-label="Ouvrir les informations de la Fiche"
          className={cn(
            'fixed right-0 top-[42%] z-40 h-auto -translate-y-1/2 rounded-l-lg rounded-r-none border-r-0 px-2 py-3 shadow-md',
            dirty
              ? 'border-warning/50 bg-warning/10 text-warning hover:bg-warning/15'
              : 'bg-background',
          )}
          onClick={onOpen}
          type="button"
          variant="outline"
        >
          <PanelRightOpen aria-hidden="true" className="size-4" />
          <span className="[writing-mode:vertical-rl]">Infos</span>
        </Button>
      )}

      <EntityDetailsDrawer
        description="Nom, description et informations éditoriales de la Fiche technique."
        onClose={onClose}
        open={open}
        title="Informations de la Fiche"
      >
        <Tabs defaultValue="general">
          <TabsList
            aria-label="Sections des informations de la Fiche"
            variant="section"
          >
            <TabsTrigger value="general" variant="section">
              Informations générales
            </TabsTrigger>
            <TabsTrigger value="history" variant="section">
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" variant="section">
            <div className="space-y-5">
              <Field>
                <FieldLabel htmlFor="technical-sheet-edit-name">
                  Nom
                </FieldLabel>
                <Input
                  disabled={!canEdit || pending}
                  id="technical-sheet-edit-name"
                  maxLength={160}
                  onChange={(event) => onNameChange(event.target.value)}
                  value={name}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="technical-sheet-edit-description">
                  Description
                </FieldLabel>
                <Textarea
                  className="min-h-40"
                  disabled={!canEdit || pending}
                  id="technical-sheet-edit-description"
                  maxLength={2000}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  value={description}
                />
              </Field>

              {canValidate && showValidationComment && (
                <Field>
                  <FieldLabel htmlFor="technical-sheet-validation-comment">
                    Commentaire de validation
                  </FieldLabel>
                  <Textarea
                    className="min-h-24"
                    id="technical-sheet-validation-comment"
                    maxLength={1000}
                    onChange={(event) => onValidationCommentChange(event.target.value)}
                    placeholder="Facultatif"
                    value={validationComment}
                  />
                </Field>
              )}

              {canEdit && (
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    className={cn(
                      dirty
                        ? 'border-warning/50 bg-warning/10 text-warning hover:bg-warning/15'
                        : null,
                    )}
                    disabled={pending || !dirty || !name.trim()}
                    onClick={onSave}
                    type="button"
                    variant="outline"
                  >
                    <Save aria-hidden="true" className="size-4" />
                    Enregistrer les informations
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" variant="section">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">
                Chargement de l’historique…
              </p>
            ) : (
              <TechnicalSheetHistory validations={history} />
            )}
          </TabsContent>
        </Tabs>
      </EntityDetailsDrawer>
    </>
  );
}

export { TechnicalSheetInformationDrawer };
