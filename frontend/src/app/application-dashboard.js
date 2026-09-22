import { dossiersDashboardModule } from '@/features/dossiers/dashboard/dossiers-dashboard';
import { coreDashboardWidgets } from '@/features/workspace/dashboard/core-dashboard-widgets';

const DASHBOARD_WIDGET_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const DASHBOARD_WIDGET_SLOTS = Object.freeze(['summary', 'content']);

function normalizeDashboardWidgetDescriptor(descriptor, index) {
  if (descriptor === null || Array.isArray(descriptor) || typeof descriptor !== 'object') {
    throw new TypeError(`Dashboard widget at index ${index} must be an object`);
  }

  if (
    typeof descriptor.id !== 'string'
    || descriptor.id.length > 100
    || !DASHBOARD_WIDGET_ID_PATTERN.test(descriptor.id)
  ) {
    throw new TypeError(`Dashboard widget at index ${index} has an invalid id`);
  }

  if (typeof descriptor.label !== 'string' || descriptor.label.trim().length === 0) {
    throw new TypeError(`Dashboard widget "${descriptor.id}" must have a label`);
  }

  if (typeof descriptor.component !== 'function') {
    throw new TypeError(`Dashboard widget "${descriptor.id}" must have a component`);
  }

  if (!DASHBOARD_WIDGET_SLOTS.includes(descriptor.slot)) {
    throw new TypeError(`Dashboard widget "${descriptor.id}" has an invalid slot`);
  }

  if (!Number.isFinite(descriptor.order)) {
    throw new TypeError(`Dashboard widget "${descriptor.id}" must have a numeric order`);
  }

  const features = descriptor.access?.features ?? [];
  const permissions = descriptor.access?.permissions ?? [];

  if (!Array.isArray(features) || !features.every((feature) => typeof feature === 'string')) {
    throw new TypeError(`Dashboard widget "${descriptor.id}" features must be an array of strings`);
  }

  if (
    !Array.isArray(permissions)
    || !permissions.every((permission) => typeof permission === 'string')
  ) {
    throw new TypeError(`Dashboard widget "${descriptor.id}" permissions must be an array of strings`);
  }

  return Object.freeze({
    ...descriptor,
    configurable: descriptor.configurable !== false,
    access: Object.freeze({
      features: Object.freeze([...features]),
      permissions: Object.freeze([...permissions]),
    }),
  });
}

/**
 * Compose les widgets du Core et ceux des modules réellement embarqués.
 *
 * Le registre est explicite pour rester déterministe et testable : un produit
 * dérivé ajoute des descriptors, il ne demande jamais au Core de découvrir des
 * composants métier dynamiquement.
 */
function composeApplicationDashboardWidgets(modules = []) {
  if (!Array.isArray(modules)) {
    throw new TypeError('modules must be an array');
  }

  const moduleWidgets = modules.flatMap((moduleDefinition, moduleIndex) => {
    if (
      moduleDefinition === null
      || Array.isArray(moduleDefinition)
      || typeof moduleDefinition !== 'object'
    ) {
      throw new TypeError(
        `Dashboard module at index ${moduleIndex} must be an object`,
      );
    }

    const widgets = moduleDefinition.widgets ?? [];

    if (!Array.isArray(widgets)) {
      throw new TypeError(`modules[${moduleIndex}].widgets must be an array`);
    }

    return widgets;
  });

  const widgets = [...coreDashboardWidgets, ...moduleWidgets]
    .map(normalizeDashboardWidgetDescriptor)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const widgetIds = widgets.map((widget) => widget.id);

  if (new Set(widgetIds).size !== widgetIds.length) {
    throw new TypeError('Dashboard widget ids must be unique');
  }

  return Object.freeze(widgets);
}

function getAccessibleDashboardWidgets(widgets, { can, hasFeature }) {
  if (!Array.isArray(widgets)) {
    throw new TypeError('widgets must be an array');
  }

  if (typeof can !== 'function' || typeof hasFeature !== 'function') {
    throw new TypeError('can and hasFeature are required');
  }

  return widgets.filter((widget) => (
    widget.access.features.every((feature) => hasFeature(feature))
    && widget.access.permissions.every((permission) => can(permission))
  ));
}

function getVisibleDashboardWidgets(accessibleWidgets, hiddenWidgetIds = []) {
  const hiddenIds = new Set(hiddenWidgetIds);

  return accessibleWidgets.filter(
    (widget) => !widget.configurable || !hiddenIds.has(widget.id),
  );
}

const APPLICATION_DASHBOARD_WIDGET_MODULES = Object.freeze([
  dossiersDashboardModule,
]);

const applicationDashboardWidgets = composeApplicationDashboardWidgets(
  APPLICATION_DASHBOARD_WIDGET_MODULES,
);

export {
  APPLICATION_DASHBOARD_WIDGET_MODULES,
  applicationDashboardWidgets,
  composeApplicationDashboardWidgets,
  getAccessibleDashboardWidgets,
  getVisibleDashboardWidgets,
};
