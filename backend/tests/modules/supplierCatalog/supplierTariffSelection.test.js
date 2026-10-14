import { describe, expect, it } from 'vitest';
import {
    selectSupplierTariffs, tariffPeriodsOverlap, tariffIsApplicable,
} from '../../../modules/supplierCatalog/supplierTariffSelection.service.js';

const tariff = (id, validFrom, validTo, isCurrent = true) => ({
    _id: id, validFrom: validFrom ? new Date(validFrom) : null,
    validTo: validTo ? new Date(validTo) : null, isCurrent,
});
const referenceDate = new Date('2026-10-14T15:00:00.000Z');

describe('M-003 — périodes et dernier tarif fournisseur connu', () => {
    it('considère la date civile de fin entière comme valide à Paris', () => {
        const current = tariff('a', '2026-10-13T00:00:00.000Z', '2026-10-14T00:00:00.000Z');
        expect(tariffIsApplicable(current, referenceDate)).toBe(true);
        expect(selectSupplierTariffs([current], referenceDate).status).toBe('AVAILABLE');
        expect(selectSupplierTariffs([current], new Date('2026-10-15T09:00:00Z')).status)
            .toBe('EXPIRED');
    });

    it('sélectionne le tarif de la période expirée la plus récente, pas le dernier import', () => {
        const newerImport = tariff('import-tardif', '2026-01-01', '2026-03-01');
        const latestPeriod = tariff('periode-recente', '2026-04-01', '2026-09-30');
        const future = tariff('futur', '2026-11-01', '2027-01-31');
        const replaced = tariff('remplace', '2026-04-01', '2026-10-05', false);
        const selected = selectSupplierTariffs([
            newerImport, latestPeriod, future, replaced,
        ], referenceDate);
        expect(selected).toMatchObject({ status: 'EXPIRED', tariff: latestPeriod });
    });

    it('préfère un tarif valide au dernier prix expiré', () => {
        const expired = tariff('ancien', '2026-01-01', '2026-09-30');
        const current = tariff('actuel', '2026-10-01', '2026-12-31');
        expect(selectSupplierTariffs([expired, current], referenceDate))
            .toMatchObject({ status: 'AVAILABLE', tariff: current });
    });

    it('ne sélectionne ni période future ni révision remplacée', () => {
        expect(selectSupplierTariffs([
            tariff('futur', '2026-12-01', null),
            tariff('remplace', '2026-01-01', '2026-09-30', false),
        ], referenceDate)).toEqual({ status: 'UNAVAILABLE', tariff: null });
    });

    it('signale les chevauchements actifs et refuse le choix arbitraire', () => {
        const a = tariff('a', '2026-09-01', '2026-11-01');
        const b = tariff('b', '2026-10-01', '2026-12-01');
        expect(selectSupplierTariffs([a, b], referenceDate))
            .toEqual({ status: 'AMBIGUOUS', tariff: null });
    });

    it('contrôle des intervalles civils inclusifs et les changements d’heure', () => {
        const a = tariff('a', '2026-10-01', '2026-10-25');
        const b = tariff('b', '2026-10-25', '2026-10-30');
        const c = tariff('c', '2026-10-26', '2026-11-01');
        expect(tariffPeriodsOverlap(a, b)).toBe(true);
        expect(tariffPeriodsOverlap(a, c)).toBe(false);
        expect(tariffIsApplicable(a, new Date('2026-10-26T00:30:00.000Z')))
            .toBe(false);
    });
});
