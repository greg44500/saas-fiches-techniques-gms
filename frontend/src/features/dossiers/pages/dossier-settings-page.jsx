import { useEffect, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGetPricingPolicyQuery,
  useUpdatePricingPolicyMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

const PRICING_POLICY_ITEMS = Object.freeze([
  Object.freeze({
    value: 'SUPPLIER_TARIFF',
    label: 'Tarif fournisseur',
  }),
  Object.freeze({
    value: 'NEGOTIATED_PRICE',
    label: 'Tarif négocié',
  }),
  Object.freeze({
    value: 'INVOICED_PRICE',
    label: 'Prix facturé',
  }),
]);

function DossierSettingsPage() {
  const { can, workspace } = useWorkspaceContext();
  const { toast } = useToast();
  const canManage = can(SUPPLIER_PERMISSION.PRICE_POLICY_MANAGE);
  const policyQuery = useGetPricingPolicyQuery(workspace.id);
  const [updatePolicy, updatePolicyState] =
    useUpdatePricingPolicyMutation();
  const [mode, setMode] = useState('NEGOTIATED_PRICE');

  useEffect(() => {
    if (!policyQuery.data?.mode) return;
    setMode(policyQuery.data.mode);
  }, [policyQuery.data?.mode]);

  async function savePolicy() {
    try {
      await updatePolicy({
        workspaceId: workspace.id,
        mode,
      }).unwrap();
      toast({
        title: 'Politique des prix mise à jour',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Modification impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Réglages des dossiers
        </h1>
        <InfoTooltip
          content="Réglages communs utilisés par les Dossiers de cet espace de travail."
          label="À propos des réglages des dossiers"
        />
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2">
            <CardTitle>Politique des prix</CardTitle>
            <InfoTooltip
              content="Définit la source de prix recherchée en priorité pour tous les Dossiers. Si elle n’est pas disponible, les règles de remplacement prévues par l’application s’appliquent."
              label="À propos de la politique des prix"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyQuery.isLoading && !policyQuery.data ? (
            <p className="text-sm text-muted-foreground">
              Chargement de la politique des prix…
            </p>
          ) : policyQuery.isError ? (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">
                La politique des prix n’a pas pu être chargée.
              </p>
              <Button
                onClick={policyQuery.refetch}
                size="sm"
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <>
              <Field>
                <FieldLabel>Source de prix prioritaire</FieldLabel>
                <Select
                  disabled={!canManage || updatePolicyState.isLoading}
                  items={PRICING_POLICY_ITEMS}
                  onValueChange={setMode}
                  value={mode}
                >
                  <SelectTrigger aria-label="Source de prix prioritaire">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_POLICY_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {canManage && (
                <div className="flex justify-end">
                  <Button
                    disabled={
                      updatePolicyState.isLoading
                      || mode === policyQuery.data?.mode
                    }
                    onClick={savePolicy}
                    type="button"
                  >
                    Enregistrer
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export {
  DossierSettingsPage,
  PRICING_POLICY_ITEMS,
};
