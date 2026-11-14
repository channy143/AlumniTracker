const PROVINCE_ALIASES: Record<string, string> = {
  'cebu province': 'Cebu',
  'cebu': 'Cebu',
  'metro manila': 'Metro Manila',
  'ncr': 'Metro Manila',
  'national capital region': 'Metro Manila',
  'bohol': 'Bohol',
  'negros oriental': 'Negros Oriental',
  'siquijor': 'Siquijor',
  'leyte': 'Leyte',
  'davao del sur': 'Davao del Sur',
};

const CITY_ALIASES: Record<string, { city: string; province?: string }> = {
  'naga': { city: 'City of Naga', province: 'Cebu' },
  'naga city': { city: 'City of Naga', province: 'Cebu' },
  'city of naga': { city: 'City of Naga', province: 'Cebu' },
  'naga cebu': { city: 'City of Naga', province: 'Cebu' },
  'naga, cebu': { city: 'City of Naga', province: 'Cebu' },
  'city of naga, cebu': { city: 'City of Naga', province: 'Cebu' },
  'cebu': { city: 'Cebu City', province: 'Cebu' },
  'cebu city': { city: 'Cebu City', province: 'Cebu' },
  'toledo': { city: 'Toledo City', province: 'Cebu' },
  'toledo city': { city: 'Toledo City', province: 'Cebu' },
  'carcar': { city: 'Carcar City', province: 'Cebu' },
  'carcar city': { city: 'Carcar City', province: 'Cebu' },
  'talisay': { city: 'Talisay City', province: 'Cebu' },
  'talisay city': { city: 'Talisay City', province: 'Cebu' },
  'city of talisay': { city: 'Talisay City', province: 'Cebu' },
  'city of talisay, cebu': { city: 'Talisay City', province: 'Cebu' },
  'mandaue': { city: 'Mandaue City', province: 'Cebu' },
  'mandaue city': { city: 'Mandaue City', province: 'Cebu' },
  'lapu-lapu': { city: 'Lapu-Lapu City', province: 'Cebu' },
  'lapu lapu': { city: 'Lapu-Lapu City', province: 'Cebu' },
  'lapu-lapu city': { city: 'Lapu-Lapu City', province: 'Cebu' },
  'danao': { city: 'Danao City', province: 'Cebu' },
  'danao city': { city: 'Danao City', province: 'Cebu' },
  'bogo': { city: 'Bogo City', province: 'Cebu' },
  'bogo city': { city: 'Bogo City', province: 'Cebu' },
  'minglanilla': { city: 'Minglanilla', province: 'Cebu' },
  'san fernando': { city: 'San Fernando', province: 'Cebu' },
  'san fernando, cebu': { city: 'San Fernando', province: 'Cebu' },
  'consolacion': { city: 'Consolacion', province: 'Cebu' },
  'liloan': { city: 'Liloan', province: 'Cebu' },
  'compostela': { city: 'Compostela', province: 'Cebu' },
  'cordova': { city: 'Cordova', province: 'Cebu' },
  'sibonga': { city: 'Sibonga', province: 'Cebu' },
  'argao': { city: 'Argao', province: 'Cebu' },
  'dalaguete': { city: 'Dalaguete', province: 'Cebu' },
  'barili': { city: 'Barili', province: 'Cebu' },
  'balamban': { city: 'Balamban', province: 'Cebu' },
  'pinamungajan': { city: 'Pinamungajan', province: 'Cebu' },
  'dumanjug': { city: 'Dumanjug', province: 'Cebu' },
  'moalboal': { city: 'Moalboal', province: 'Cebu' },
  'oslob': { city: 'Oslob', province: 'Cebu' },
  'malabuyoc': { city: 'Malabuyoc', province: 'Cebu' },
};

function cleanKey(val: string): string {
  return val
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*cebu$/i, '')
    .replace(/\s+/g, ' ');
}

export function normalizeProvinceName(rawProvince?: string | null): string {
  if (!rawProvince) return '';
  const trimmed = rawProvince.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (PROVINCE_ALIASES[lower]) return PROVINCE_ALIASES[lower];
  // If someone accidentally entered a Cebu municipality (e.g. "Minglanilla") as province
  const cityMatch = CITY_ALIASES[cleanKey(trimmed)];
  if (cityMatch?.province) return cityMatch.province;
  return trimmed;
}

export function normalizeCityName(rawCity?: string | null, rawProvince?: string | null): string {
  if (!rawCity) {
    // Recover city if someone entered a municipality name into province
    if (rawProvince) {
      const fromProv = CITY_ALIASES[cleanKey(rawProvince)];
      if (fromProv) return fromProv.city;
    }
    return '';
  }
  const trimmed = rawCity.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower].city;
  const cleaned = cleanKey(trimmed);
  if (CITY_ALIASES[cleaned]) return CITY_ALIASES[cleaned].city;
  return trimmed;
}

export function normalizePhPhone(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (/^\+639\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  return trimmed;
}


