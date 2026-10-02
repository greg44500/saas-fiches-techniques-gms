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
    }),
    PARTIAL: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.PARTIAL,
        label: 'Valorisation incomplète',
        tone: 'warning',
        automaticValuationEligible: false,
    }),
    COMPLETE: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE,
        label: 'Valorisée',
        tone: 'success',
        automaticValuationEligible: false,
    }),
    STALE: Object.freeze({
        value: TECHNICAL_SHEET_VALUATION_STATUS.STALE,
        label: 'Calcul à actualiser',
        tone: 'warning',
        automaticValuationEligible: true,
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
    }),
    NO_PRICE: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.NO_PRICE,
        label: 'Prix indisponible',
        tone: 'destructive',
    }),
    VALUED: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.VALUED,
        label: 'Valorisée',
        tone: 'success',
    }),
    STALE: Object.freeze({
        value: TECHNICAL_SHEET_LINE_VALUATION_STATUS.STALE,
        label: 'Calcul à actualiser',
        tone: 'warning',
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
    }),
    MANUAL: Object.freeze({
        value: TECHNICAL_SHEET_FINAL_PRICE_MODE.MANUAL,
        label: 'Manuel',
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

const TECHNICAL_SHEET_PRODUCTION_DEFAULTS = Object.freeze({
    productionUnit:
        TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY.UNIT.value,
    portionsPerProductionUnit: '1',
    saleBasis: TECHNICAL_SHEET_SALE_BASIS.PIECE,
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

const TECHNICAL_SHEET_METRIC = Object.freeze({
    TECHNICAL_SHEETS: 'technical_sheets',
});

const TECHNICAL_SHEET_TRASH_RETENTION = Object.freeze({
    DEFAULT_DAYS: 30,
    MIN_DAYS: 1,
    MAX_DAYS: 90,
});

export {
    TECHNICAL_SHEET_CHANGE_KIND,
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_FINAL_PRICE_MODE_REGISTRY,
    TECHNICAL_SHEET_LINE_KIND,
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
};
