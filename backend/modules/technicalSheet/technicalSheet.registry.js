const TECHNICAL_SHEET_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
    DELETED: 'DELETED',
});

const TECHNICAL_SHEET_STATUS_REGISTRY = Object.freeze({
    ACTIVE: Object.freeze({
        value: TECHNICAL_SHEET_STATUS.ACTIVE,
        label: 'Active',
        tone: 'success',
    }),
    ARCHIVED: Object.freeze({
        value: TECHNICAL_SHEET_STATUS.ARCHIVED,
        label: 'Archivée',
        tone: 'archived',
    }),
    DELETED: Object.freeze({
        value: TECHNICAL_SHEET_STATUS.DELETED,
        label: 'Corbeille',
        tone: 'destructive',
    }),
});

const TECHNICAL_SHEET_LINE_KIND = Object.freeze({
    INGREDIENT: 'INGREDIENT',
    ECONOMAT: 'ECONOMAT',
});

const TECHNICAL_SHEET_LINE_KIND_REGISTRY = Object.freeze({
    INGREDIENT: Object.freeze({
        value: TECHNICAL_SHEET_LINE_KIND.INGREDIENT,
        label: 'Ingrédients',
        sectionLabel: 'INGRÉDIENTS',
        opposite:
            TECHNICAL_SHEET_LINE_KIND.ECONOMAT,
        materialCostShareEligible: true,
        primary: true,
        showSectionHeader: false,
    }),
    ECONOMAT: Object.freeze({
        value: TECHNICAL_SHEET_LINE_KIND.ECONOMAT,
        label: 'Économat',
        sectionLabel: 'Économat',
        opposite:
            TECHNICAL_SHEET_LINE_KIND.INGREDIENT,
        materialCostShareEligible: false,
        primary: false,
        showSectionHeader: true,
    }),
});

const TECHNICAL_SHEET_VALUATION_STATUS = Object.freeze({
    NOT_VALUED: 'NOT_VALUED',
    PARTIAL: 'PARTIAL',
    COMPLETE: 'COMPLETE',
    STALE: 'STALE',
});

const TECHNICAL_SHEET_VALUATION_STATUS_REGISTRY = Object.freeze({
    NOT_VALUED: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.NOT_VALUED,
        label: 'Non valorisée',
        tone: 'alert',
        automaticValuationEligible: true,
        validationEligible: false,
    }),
    PARTIAL: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.PARTIAL,
        label: 'Valorisation incomplète',
        tone: 'warning',
        automaticValuationEligible: false,
        validationEligible: false,
    }),
    COMPLETE: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE,
        label: 'Valorisée',
        tone: 'success',
        automaticValuationEligible: false,
        validationEligible: true,
    }),
    STALE: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.STALE,
        label: 'Calcul à actualiser',
        tone: 'warning',
        automaticValuationEligible: true,
        validationEligible: false,
    }),
});

const TECHNICAL_SHEET_LINE_VALUATION_STATUS = Object.freeze({
    UNRESOLVED: 'UNRESOLVED',
    NO_PRICE: 'NO_PRICE',
    VALUED: 'VALUED',
    STALE: 'STALE',
});

const TECHNICAL_SHEET_LINE_VALUATION_STATUS_REGISTRY = Object.freeze({
    UNRESOLVED: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.UNRESOLVED,
        label: 'Article à choisir',
        tone: 'warning',
        openPricingEligible: false,
    }),
    NO_PRICE: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.NO_PRICE,
        label: 'Prix indisponible',
        tone: 'destructive',
        openPricingEligible: true,
    }),
    VALUED: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.VALUED,
        label: 'Valorisée',
        tone: 'success',
        openPricingEligible: false,
    }),
    STALE: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.STALE,
        label: 'Calcul à actualiser',
        tone: 'warning',
        openPricingEligible: false,
    }),
});

const TECHNICAL_SHEET_FINAL_PRICE_MODE = Object.freeze({
    ADVISED: 'ADVISED',
    MANUAL: 'MANUAL',
});

const TECHNICAL_SHEET_FINAL_PRICE_MODE_REGISTRY = Object.freeze({
    ADVISED: Object.freeze({
        value: TECHNICAL_SHEET_FINAL_PRICE_MODE.ADVISED,
        label: 'Conseillé',
        requiresManualPrice: false,
    }),
    MANUAL: Object.freeze({
        value: TECHNICAL_SHEET_FINAL_PRICE_MODE.MANUAL,
        label: 'Manuel',
        requiresManualPrice: true,
    }),
});

const TECHNICAL_SHEET_SALE_BASIS = Object.freeze({
    PIECE: 'PIECE',
    PORTION: 'PORTION',
});

const TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY = Object.freeze({
    UNIT: Object.freeze({
        value: 'UNIT',
        label: 'Pièce',
    }),
});

const TECHNICAL_SHEET_VAT_RATE_REGISTRY = Object.freeze({
    REDUCED: Object.freeze({
        value: 550,
        label: '5,5 %',
    }),
    INTERMEDIATE: Object.freeze({
        value: 1000,
        label: '10 %',
    }),
});

const TECHNICAL_SHEET_VAT_RATE_BASIS_POINTS = Object.freeze(
    Object.values(TECHNICAL_SHEET_VAT_RATE_REGISTRY)
        .map((definition) => definition.value),
);

const TECHNICAL_SHEET_PRODUCTION_DEFAULTS = Object.freeze({
    productionUnit:
        TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY.UNIT.value,
    portionsPerProductionUnit: '1',
    saleBasis: TECHNICAL_SHEET_SALE_BASIS.PIECE,
    vatRateBasisPoints:
        TECHNICAL_SHEET_VAT_RATE_REGISTRY.REDUCED.value,
    finalPriceMode:
        TECHNICAL_SHEET_FINAL_PRICE_MODE.ADVISED,
});

const TECHNICAL_SHEET_SALE_BASIS_REGISTRY = Object.freeze({
    PIECE: Object.freeze({
        value: TECHNICAL_SHEET_SALE_BASIS.PIECE,
        label: 'Pièce',
    }),
    PORTION: Object.freeze({
        value: TECHNICAL_SHEET_SALE_BASIS.PORTION,
        label: 'Portion',
    }),
});

const TECHNICAL_SHEET_CHANGE_KIND = Object.freeze({
    IDENTITY: 'IDENTITY',
    COMPOSITION: 'COMPOSITION',
    SOURCING: 'SOURCING',
    ECONOMICS: 'ECONOMICS',
});

const TECHNICAL_SHEET_CHANGE_KIND_REGISTRY = Object.freeze({
    IDENTITY: Object.freeze({
        value: TECHNICAL_SHEET_CHANGE_KIND.IDENTITY,
        label: 'Identité',
    }),
    COMPOSITION: Object.freeze({
        value: TECHNICAL_SHEET_CHANGE_KIND.COMPOSITION,
        label: 'Composition',
    }),
    SOURCING: Object.freeze({
        value: TECHNICAL_SHEET_CHANGE_KIND.SOURCING,
        label: 'Approvisionnement',
    }),
    ECONOMICS: Object.freeze({
        value: TECHNICAL_SHEET_CHANGE_KIND.ECONOMICS,
        label: 'Économie',
    }),
});

const TECHNICAL_SHEET_ECONOMIC_METRIC_REGISTRY = Object.freeze({
    MATERIAL_COST_HT: Object.freeze({
        value: 'materialCostHt',
        label: 'CM HT',
        description:
            'Coût matière HT total des Ingrédients pour toute la production.',
    }),
    ECONOMAT_COST_HT: Object.freeze({
        value: 'economatCostHt',
        label: 'CE HT',
        description:
            'Coût Économat HT total pour toute la production.',
    }),
    MANUFACTURING_COST_HT: Object.freeze({
        value: 'manufacturingCostHt',
        label: 'CF HT',
        description:
            'Coût de fabrication HT total pris en compte par la Fiche : Matières + Économat.',
    }),
    MATERIAL_COST_PER_PRODUCTION_UNIT_HT: Object.freeze({
        value: 'materialCostPerProductionUnitHt',
        label: 'CM/Pce HT',
        description:
            'Coût matière HT par pièce fabriquée.',
    }),
    MANUFACTURING_COST_PER_PRODUCTION_UNIT_HT: Object.freeze({
        value: 'manufacturingCostPerProductionUnitHt',
        label: 'CF/Pce HT',
        description:
            'Coût de fabrication HT par pièce fabriquée.',
    }),
    MATERIAL_COST_PER_PORTION_HT: Object.freeze({
        value: 'materialCostPerPortionHt',
        label: 'CMU HT',
        description:
            'Coût matière unitaire HT par portion.',
    }),
    ECONOMAT_COST_PER_PORTION_HT: Object.freeze({
        value: 'economatCostPerPortionHt',
        label: 'CEU HT',
        description:
            'Coût Économat unitaire HT par portion.',
    }),
    MANUFACTURING_COST_PER_PORTION_HT: Object.freeze({
        value: 'manufacturingCostPerPortionHt',
        label: 'CFU HT',
        description:
            'Coût de fabrication unitaire HT par portion.',
    }),
    ACTUAL_MARGIN_BASIS_POINTS: Object.freeze({
        value: 'actualMarginBasisPoints',
        label: 'Marge réelle',
        description:
            'MR = Marge réelle. Part du Prix retenu HT restant après déduction du coût de fabrication de la base de vente.',
    }),
    ACTUAL_MARGIN_AMOUNT_HT: Object.freeze({
        value: 'actualMarginAmountHt',
        label: 'Marge sur coût de fabrication HT',
        description:
            'Différence HT entre le Prix retenu et le coût de fabrication pour une unité de vente. Ce montant ne constitue pas un bénéfice comptable.',
    }),
    MANUFACTURING_MARGIN_PRODUCTION_HT: Object.freeze({
        value: 'manufacturingMarginProductionHt',
        label: 'Marge sur coût de fabrication HT · production',
        description:
            'Marge sur coût de fabrication HT cumulée sur toutes les unités vendables de la production. Ce montant ne constitue pas un bénéfice comptable.',
    }),
    TARGET_MARGIN_DELTA_BASIS_POINTS: Object.freeze({
        value: 'targetMarginDeltaBasisPoints',
        label: 'Écart vs cible',
        description:
            'Écart en points entre la marge réelle et la marge cible.',
    }),
    TARGET_MARGIN_DELTA_AMOUNT_HT: Object.freeze({
        value: 'targetMarginDeltaAmountHt',
        label: 'Écart monétaire vs cible',
        description:
            'Écart HT par unité de vente entre le Prix retenu et le prix nécessaire pour atteindre exactement la marge cible.',
    }),
    TARGET_MARGIN_DELTA_PRODUCTION_HT: Object.freeze({
        value: 'targetMarginDeltaProductionHt',
        label: 'Écart production vs cible',
        description:
            'Écart HT cumulé sur la production entre la marge obtenue et la marge cible.',
    }),
});

const TECHNICAL_SHEET_FEATURE = Object.freeze({
    EXPORT: 'technical_sheet_export',
});

const TECHNICAL_SHEET_METRIC = Object.freeze({
    TECHNICAL_SHEETS: 'technical_sheets',
    EXPORTS_MONTHLY: 'technical_sheet_exports_monthly',
});

const TECHNICAL_SHEET_TRASH_RETENTION = Object.freeze({
    DEFAULT_DAYS: 30,
    MIN_DAYS: 1,
    MAX_DAYS: 90,
});

export {
    TECHNICAL_SHEET_CHANGE_KIND,
    TECHNICAL_SHEET_CHANGE_KIND_REGISTRY,
    TECHNICAL_SHEET_ECONOMIC_METRIC_REGISTRY,
    TECHNICAL_SHEET_FEATURE,
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_FINAL_PRICE_MODE_REGISTRY,
    TECHNICAL_SHEET_LINE_KIND,
    TECHNICAL_SHEET_LINE_KIND_REGISTRY,
    TECHNICAL_SHEET_LINE_VALUATION_STATUS,
    TECHNICAL_SHEET_LINE_VALUATION_STATUS_REGISTRY,
    TECHNICAL_SHEET_METRIC,
    TECHNICAL_SHEET_PRODUCTION_DEFAULTS,
    TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY,
    TECHNICAL_SHEET_SALE_BASIS,
    TECHNICAL_SHEET_SALE_BASIS_REGISTRY,
    TECHNICAL_SHEET_STATUS,
    TECHNICAL_SHEET_STATUS_REGISTRY,
    TECHNICAL_SHEET_TRASH_RETENTION,
    TECHNICAL_SHEET_VALUATION_STATUS,
    TECHNICAL_SHEET_VALUATION_STATUS_REGISTRY,
    TECHNICAL_SHEET_VAT_RATE_BASIS_POINTS,
    TECHNICAL_SHEET_VAT_RATE_REGISTRY,
};
