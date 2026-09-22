import { DossiersDashboardWidget } from '@/features/dossiers/components/dossiers-dashboard-widget';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';

const dossiersDashboardModule = Object.freeze({
  widgets: Object.freeze([
    Object.freeze({
      id: 'gms.dossiers-overview',
      label: 'Dossiers',
      description: 'Accès direct aux dossiers métier du workspace.',
      component: DossiersDashboardWidget,
      slot: 'content',
      order: 50,
      configurable: false,
      access: Object.freeze({
        features: Object.freeze([]),
        permissions: Object.freeze([DOSSIER_PERMISSION.READ]),
      }),
    }),
  ]),
});

export { dossiersDashboardModule };
