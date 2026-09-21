const GEOPLATEFORME_COMPLETION_URL =
  'https://data.geopf.fr/geocodage/completion/';
const GEOPLATEFORME_MAX_RESPONSES = 8;

function stripLocalitySuffix(fulltext, postalCode, city) {
  const locality = [postalCode, city].filter(Boolean).join(' ').trim();
  const suffix = locality ? `, ${locality}` : '';

  if (suffix && fulltext?.endsWith(suffix)) {
    return fulltext.slice(0, -suffix.length).trim();
  }

  return null;
}

function normalizeGeoplateformeSuggestion(result, index) {
  const postalCode = result?.zipcode ?? result?.zipcodes?.[0] ?? null;
  const city = result?.city ?? null;
  const fulltext = typeof result?.fulltext === 'string'
    ? result.fulltext.trim()
    : '';
  const strippedAddress = stripLocalitySuffix(fulltext, postalCode, city);
  const address = (
    strippedAddress
    || fulltext
    || result?.street
  )?.trim?.() || null;

  if (!fulltext || !address) {
    return null;
  }

  return {
    id: [
      fulltext,
      result?.x ?? '',
      result?.y ?? '',
      index,
    ].join(':'),
    label: fulltext,
    address,
    postalCode,
    city,
  };
}

async function searchGeoplateformeAddresses(
  query,
  {
    fetchImpl = globalThis.fetch,
    signal,
  } = {},
) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    text: normalizedQuery,
    type: 'StreetAddress',
    maximumResponses: String(GEOPLATEFORME_MAX_RESPONSES),
  });
  const response = await fetchImpl(
    `${GEOPLATEFORME_COMPLETION_URL}?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Géoplateforme address completion failed with status ${response.status}`,
    );
  }

  const payload = await response.json();

  return (Array.isArray(payload?.results) ? payload.results : [])
    .filter((result) => !result?.country || result.country === 'StreetAddress')
    .slice(0, GEOPLATEFORME_MAX_RESPONSES)
    .map(normalizeGeoplateformeSuggestion)
    .filter(Boolean);
}

export {
  GEOPLATEFORME_COMPLETION_URL,
  GEOPLATEFORME_MAX_RESPONSES,
  normalizeGeoplateformeSuggestion,
  searchGeoplateformeAddresses,
  stripLocalitySuffix,
};
