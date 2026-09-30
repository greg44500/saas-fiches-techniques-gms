import { describe, expect, it } from 'vitest';

import {
  formatAccessMode,
  formatAccessReason,
  formatBillingInterval,
  formatFeatureAvailability,
  formatFeatureLabel,
  formatLimitLabel,
  formatPlanLimitValue,
  formatSubscriptionKind,
  formatSubscriptionStatus,
  getTrialProgress,
} from '@/features/subscription/lib/subscription-formatters';

describe('subscription formatters', () => {
  it('traduit les valeurs métier connues sans masquer une valeur future', () => {
    expect(formatSubscriptionStatus('trialing')).toBe('Période d’essai');
    expect(formatSubscriptionKind('baseline')).toBe('Plan de base');
    expect(formatBillingInterval('monthly')).toBe('Mensuel');
    expect(formatAccessMode('remediation')).toBe('Mise en conformité requise');
    expect(formatAccessReason('plan_limits_exceeded')).toBe(
      'La consommation actuelle dépasse une ou plusieurs limites du plan effectif.',
    );
    expect(formatLimitLabel({ key: 'storage_bytes', usage: 1200, limit: 1000 })).toBe('Stockage');
    expect(formatLimitLabel('future_metric')).toBe('future_metric');
  });

  it('privilégie les métadonnées métier fournies par le backend', () => {
    const featurePresentations = {
      product_reference_access: {
        label: 'Accès au référentiel Produits',
      },
    };
    const limitPresentations = {
      technical_sheets: {
        label: 'Fiches techniques',
      },
    };

    expect(
      formatFeatureLabel('product_reference_access', featurePresentations),
    ).toBe('Accès au référentiel Produits');
    expect(
      formatLimitLabel('technical_sheets', limitPresentations),
    ).toBe('Fiches techniques');
  });

  it('formate la disponibilité effective sans inventer une échéance', () => {
    const now = new Date('2026-09-14T00:00:00.000Z');

    expect(formatFeatureAvailability({
      mode: 'open_ended',
      endsAt: null,
    }, { now })).toBe('Sans échéance');

    expect(formatFeatureAvailability({
      mode: 'bounded',
      endsAt: '2026-09-20T00:00:00.000Z',
    }, { now })).toContain('6 jours restants');

    expect(formatFeatureAvailability(null, { now })).toBe(
      'Disponibilité à vérifier',
    );
  });

  it('formate les limites du plan sans reconstruire de règle métier', () => {
    expect(formatPlanLimitValue('members', 5)).toBe('5');
    expect(formatPlanLimitValue('storage_bytes', 104857600)).toBe('100 Mo');
    expect(formatPlanLimitValue('future_metric', null)).toBe('Illimité');
  });

  it('calcule la progression informative d’un trial', () => {
    expect(getTrialProgress({
      startAt: '2026-09-01T00:00:00.000Z',
      endAt: '2026-09-11T00:00:00.000Z',
      now: new Date('2026-09-06T00:00:00.000Z'),
    })).toEqual({
      progressPercent: 50,
      remainingDays: 5,
    });
  });

  it('borne la progression et refuse les périodes invalides', () => {
    expect(getTrialProgress({
      startAt: '2026-09-01T00:00:00.000Z',
      endAt: '2026-09-11T00:00:00.000Z',
      now: new Date('2026-09-20T00:00:00.000Z'),
    })).toEqual({
      progressPercent: 100,
      remainingDays: 0,
    });

    expect(getTrialProgress({ startAt: null, endAt: null })).toBeNull();
  });
});
