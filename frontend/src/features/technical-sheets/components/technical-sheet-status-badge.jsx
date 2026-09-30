import { StatusBadge } from '@/components/shared/status-badge';

const TECHNICAL_SHEET_BADGE_TONE = Object.freeze({
  success: 'success',
  warning: 'warning',
  alert: 'destructive',
  archived: 'neutral',
  destructive: 'destructive',
  neutral: 'neutral',
});

function TechnicalSheetStatusBadge({
  children,
  className,
  tone = 'neutral',
}) {
  return (
    <StatusBadge
      className={className}
      tone={TECHNICAL_SHEET_BADGE_TONE[tone] ?? 'neutral'}
    >
      {children}
    </StatusBadge>
  );
}

export {
  TECHNICAL_SHEET_BADGE_TONE,
  TechnicalSheetStatusBadge,
};
