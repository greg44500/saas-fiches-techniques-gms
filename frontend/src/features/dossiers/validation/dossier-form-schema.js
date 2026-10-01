import { z } from 'zod';

const optionalText = (max, message) => z
  .string()
  .trim()
  .max(max, message);

const marginInputSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 && parsed < 100;
  }, 'La marge cible doit être comprise entre 0 et moins de 100 %.');

const dossierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Le nom du dossier est obligatoire.')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères.'),
  brand: optionalText(120, 'L’enseigne ne peut pas dépasser 120 caractères.'),
  locationAddress: optionalText(240, 'L’adresse ne peut pas dépasser 240 caractères.'),
  locationPostalCode: optionalText(20, 'Le code postal ne peut pas dépasser 20 caractères.'),
  locationCity: optionalText(120, 'La ville ne peut pas dépasser 120 caractères.'),
  documentEmail: z
    .string()
    .trim()
    .max(254, 'L’email ne peut pas dépasser 254 caractères.')
    .refine(
      (value) => value.length === 0 || z.email().safeParse(value).success,
      'Saisissez une adresse email valide.',
    ),
  phone: optionalText(40, 'Le téléphone ne peut pas dépasser 40 caractères.'),
  contactName: optionalText(160, 'Le responsable ne peut pas dépasser 160 caractères.'),
  defaultTargetMargin: marginInputSchema,
});

function nullableTrimmed(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function buildDossierFormDefaults(dossier = null) {
  return {
    name: dossier?.name ?? '',
    brand: dossier?.brand ?? '',
    locationAddress: dossier?.location?.address ?? '',
    locationPostalCode: dossier?.location?.postalCode ?? '',
    locationCity: dossier?.location?.city ?? '',
    documentEmail: dossier?.documentEmail ?? '',
    phone: dossier?.phone ?? '',
    contactName: dossier?.contactName ?? '',
    defaultTargetMargin: Number.isInteger(
      dossier?.technicalSheetSettings?.defaultTargetMarginBasisPoints,
    )
      ? String(
          dossier.technicalSheetSettings.defaultTargetMarginBasisPoints / 100,
        )
      : '',
  };
}

function buildDossierFormPayload(
  values,
  { includeDefaultTargetMargin = false } = {},
) {
  const address = nullableTrimmed(values.locationAddress);
  const postalCode = nullableTrimmed(values.locationPostalCode);
  const city = nullableTrimmed(values.locationCity);
  const hasLocation = Boolean(address || postalCode || city);

  const payload = {
    name: values.name.trim(),
    brand: nullableTrimmed(values.brand),
    location: hasLocation
      ? {
          address,
          postalCode,
          city,
        }
      : null,
    documentEmail: nullableTrimmed(values.documentEmail),
    phone: nullableTrimmed(values.phone),
    contactName: nullableTrimmed(values.contactName),
  };

  if (includeDefaultTargetMargin) {
    payload.defaultTargetMarginBasisPoints = Math.round(
      Number(values.defaultTargetMargin.trim().replace(',', '.')) * 100,
    );
  }

  return payload;
}

export {
  buildDossierFormDefaults,
  buildDossierFormPayload,
  dossierFormSchema,
  nullableTrimmed,
};
