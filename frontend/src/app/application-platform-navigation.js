import { corePlatformNavigationSections } from '@/features/platform/lib/platform-navigation';

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function normalizePlatformNavigationItem(item, label) {
  if (
    item === null
    || Array.isArray(item)
    || typeof item !== 'object'
  ) {
    throw new TypeError(`${label} must be an object`);
  }

  assertNonEmptyString(item.id, `${label}.id`);
  assertNonEmptyString(item.label, `${label}.label`);
  assertNonEmptyString(item.to, `${label}.to`);

  if (
    item.isVisible !== undefined
    && typeof item.isVisible !== 'function'
  ) {
    throw new TypeError(`${label}.isVisible must be a function`);
  }

  return Object.freeze({
    ...item,
    type: 'item',
  });
}

function normalizePlatformNavigationEntry(entry, label) {
  if (
    entry === null
    || Array.isArray(entry)
    || typeof entry !== 'object'
  ) {
    throw new TypeError(`${label} must be an object`);
  }

  assertNonEmptyString(entry.id, `${label}.id`);
  assertNonEmptyString(entry.label, `${label}.label`);

  const inferredType = entry.type ?? (
    Array.isArray(entry.items) ? 'group' : 'item'
  );

  if (inferredType === 'group') {
    if (!Array.isArray(entry.items)) {
      throw new TypeError(`${label}.items must be an array`);
    }

    if (
      entry.isVisible !== undefined
      && typeof entry.isVisible !== 'function'
    ) {
      throw new TypeError(`${label}.isVisible must be a function`);
    }

    return Object.freeze({
      ...entry,
      type: 'group',
      items: Object.freeze(
        entry.items.map((item, itemIndex) => (
          normalizePlatformNavigationItem(
            item,
            `${label}.items[${itemIndex}]`,
          )
        )),
      ),
    });
  }

  if (inferredType !== 'item') {
    throw new TypeError(
      `${label}.type must be "item" or "group"`,
    );
  }

  return normalizePlatformNavigationItem(entry, label);
}

function assertUniquePlatformNavigationEntries(navigation) {
  const registeredIds = new Set();
  const registeredDestinations = new Set();

  const registerItem = (item) => {
    if (registeredIds.has(item.id)) {
      throw new TypeError(
        `Duplicate Platform navigation id "${item.id}"`,
      );
    }

    registeredIds.add(item.id);

    if (registeredDestinations.has(item.to)) {
      throw new TypeError(
        `Duplicate Platform navigation destination "${item.to}"`,
      );
    }

    registeredDestinations.add(item.to);
  };

  navigation.forEach((entry) => {
    if (registeredIds.has(entry.id)) {
      throw new TypeError(
        `Duplicate Platform navigation id "${entry.id}"`,
      );
    }

    registeredIds.add(entry.id);

    if (entry.type === 'group') {
      entry.items.forEach(registerItem);
      return;
    }

    if (registeredDestinations.has(entry.to)) {
      throw new TypeError(
        `Duplicate Platform navigation destination "${entry.to}"`,
      );
    }

    registeredDestinations.add(entry.to);
  });
}

/**
 * Compose explicitement la navigation Platform du Core et des modules du SaaS
 * dérivé. Le Core ne découvre jamais automatiquement les modules métier.
 */
function composeApplicationPlatformNavigation(navigationModules = []) {
  if (!Array.isArray(navigationModules)) {
    throw new TypeError('navigationModules must be an array');
  }

  const applicationSections = navigationModules.flatMap(
    (moduleDefinition, moduleIndex) => {
      if (
        moduleDefinition === null
        || Array.isArray(moduleDefinition)
        || typeof moduleDefinition !== 'object'
      ) {
        throw new TypeError(
          `Platform navigation module at index ${moduleIndex} must be an object`,
        );
      }

      const sections = moduleDefinition.sections ?? [];

      if (!Array.isArray(sections)) {
        throw new TypeError(
          `navigationModules[${moduleIndex}].sections must be an array`,
        );
      }

      return sections.map((entry, entryIndex) => (
        normalizePlatformNavigationEntry(
          entry,
          `navigationModules[${moduleIndex}].sections[${entryIndex}]`,
        )
      ));
    },
  );

  const navigation = Object.freeze([
    ...corePlatformNavigationSections,
    ...applicationSections,
  ]);

  assertUniquePlatformNavigationEntries(navigation);

  return navigation;
}

/**
 * Point de composition du SaaS dérivé.
 *
 * Les modules ajoutés ici peuvent déclarer leurs propres libellés, routes,
 * icônes et règles isVisible(context) sans que le Core importe le métier.
 */
const APPLICATION_PLATFORM_NAVIGATION_MODULES = Object.freeze([]);

const APPLICATION_PLATFORM_NAVIGATION =
  composeApplicationPlatformNavigation(
    APPLICATION_PLATFORM_NAVIGATION_MODULES,
  );

export {
  APPLICATION_PLATFORM_NAVIGATION,
  APPLICATION_PLATFORM_NAVIGATION_MODULES,
  composeApplicationPlatformNavigation,
};
