export interface PsgcOption {
  code: string;
  name: string;
}

const PSGC_BASE = 'https://psgc.gitlab.io/api';

// Built-in fallback so cascading dropdowns always work even offline or if PSGC API is slow
const FALLBACK_PROVINCES: PsgcOption[] = [
  { code: '072200000', name: 'Cebu' },
  { code: '071200000', name: 'Bohol' },
  { code: '074600000', name: 'Negros Oriental' },
  { code: '076100000', name: 'Siquijor' },
  { code: '130000000', name: 'Metro Manila (NCR)' },
  { code: '083700000', name: 'Leyte' },
  { code: '064500000', name: 'Negros Occidental' },
  { code: '063000000', name: 'Iloilo' },
  { code: '112400000', name: 'Davao del Sur' },
  { code: '104300000', name: 'Misamis Oriental' },
  { code: '042100000', name: 'Cavite' },
  { code: '043400000', name: 'Laguna' },
  { code: '045800000', name: 'Rizal' },
  { code: '031400000', name: 'Bulacan' },
  { code: '035400000', name: 'Pampanga' },
];

const FALLBACK_CITIES_BY_PROVINCE: Record<string, PsgcOption[]> = {
  '072200000': [
    { code: '072201000', name: 'Alcantara' },
    { code: '072202000', name: 'Alcoy' },
    { code: '072203000', name: 'Alegria' },
    { code: '072204000', name: 'Aloguinsan' },
    { code: '072205000', name: 'Argao' },
    { code: '072206000', name: 'Asturias' },
    { code: '072207000', name: 'Badian' },
    { code: '072208000', name: 'Balamban' },
    { code: '072209000', name: 'Bantayan' },
    { code: '072210000', name: 'Barili' },
    { code: '072211000', name: 'City of Bogo' },
    { code: '072212000', name: 'Boljoon' },
    { code: '072213000', name: 'Borbon' },
    { code: '072214000', name: 'City of Carcar' },
    { code: '072215000', name: 'Carmen' },
    { code: '072216000', name: 'Catmon' },
    { code: '072217000', name: 'Cebu City' },
    { code: '072218000', name: 'Compostela' },
    { code: '072219000', name: 'Consolacion' },
    { code: '072220000', name: 'Cordova' },
    { code: '072221000', name: 'Daanbantayan' },
    { code: '072222000', name: 'Dalaguete' },
    { code: '072223000', name: 'Danao City' },
    { code: '072224000', name: 'Dumanjug' },
    { code: '072225000', name: 'Ginatilan' },
    { code: '072226000', name: 'Lapu-Lapu City' },
    { code: '072227000', name: 'Liloan' },
    { code: '072228000', name: 'Madridejos' },
    { code: '072229000', name: 'Malabuyoc' },
    { code: '072230000', name: 'Mandaue City' },
    { code: '072231000', name: 'Medellin' },
    { code: '072232000', name: 'Minglanilla' },
    { code: '072233000', name: 'Moalboal' },
    { code: '072234000', name: 'City of Naga' },
    { code: '072235000', name: 'Oslob' },
    { code: '072236000', name: 'Pilar' },
    { code: '072237000', name: 'Pinamungajan' },
    { code: '072238000', name: 'Poro' },
    { code: '072239000', name: 'Ronda' },
    { code: '072240000', name: 'Samboan' },
    { code: '072241000', name: 'San Fernando' },
    { code: '072242000', name: 'San Francisco' },
    { code: '072243000', name: 'San Remigio' },
    { code: '072244000', name: 'Santa Fe' },
    { code: '072245000', name: 'Santander' },
    { code: '072246000', name: 'Sibonga' },
    { code: '072247000', name: 'Sogod' },
    { code: '072248000', name: 'Tabogon' },
    { code: '072249000', name: 'Tabuelan' },
    { code: '072250000', name: 'City of Talisay' },
    { code: '072251000', name: 'Toledo City' },
    { code: '072252000', name: 'Tuburan' },
    { code: '072253000', name: 'Tudela' },
  ],
};

let provincesCache: PsgcOption[] | null = null;
const citiesCache = new Map<string, PsgcOption[]>();
const barangaysCache = new Map<string, PsgcOption[]>();

export function normalizeCityForMatch(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^city of\s+/i, '')
    .replace(/\s+city$/i, '')
    .replace(/,\s*cebu$/i, '')
    .trim();
}

export async function fetchPhProvinces(): Promise<PsgcOption[]> {
  if (provincesCache) return provincesCache;
  try {
    const res = await fetch(`${PSGC_BASE}/provinces/`);
    if (!res.ok) throw new Error('PSGC provinces failed');
    const data = await res.json();
    const list: PsgcOption[] = (Array.isArray(data) ? data : [])
      .map((p: any) => ({ code: String(p.code), name: String(p.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!list.some((p) => p.name.toLowerCase().includes('metro manila'))) {
      list.push({ code: '130000000', name: 'Metro Manila (NCR)' });
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    provincesCache = list;
    return list;
  } catch {
    provincesCache = [...FALLBACK_PROVINCES].sort((a, b) => a.name.localeCompare(b.name));
    return provincesCache;
  }
}

export async function fetchPhCitiesByProvince(provinceCode: string): Promise<PsgcOption[]> {
  if (!provinceCode) return [];
  if (citiesCache.has(provinceCode)) return citiesCache.get(provinceCode)!;
  try {
    const endpoint =
      provinceCode === '130000000'
        ? `${PSGC_BASE}/regions/130000000/cities-municipalities/`
        : `${PSGC_BASE}/provinces/${provinceCode}/cities-municipalities/`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('PSGC cities failed');
    const data = await res.json();
    const list: PsgcOption[] = (Array.isArray(data) ? data : [])
      .map((c: any) => ({ code: String(c.code), name: String(c.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    citiesCache.set(provinceCode, list);
    return list;
  } catch {
    const fallback = FALLBACK_CITIES_BY_PROVINCE[provinceCode] || [];
    citiesCache.set(provinceCode, fallback);
    return fallback;
  }
}

export async function fetchPhBarangaysByCity(cityCode: string): Promise<PsgcOption[]> {
  if (!cityCode) return [];
  if (barangaysCache.has(cityCode)) return barangaysCache.get(cityCode)!;
  try {
    const res = await fetch(`${PSGC_BASE}/cities-municipalities/${cityCode}/barangays/`);
    if (!res.ok) throw new Error('PSGC barangays failed');
    const data = await res.json();
    const list: PsgcOption[] = (Array.isArray(data) ? data : [])
      .map((b: any) => ({ code: String(b.code), name: String(b.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    barangaysCache.set(cityCode, list);
    return list;
  } catch {
    barangaysCache.set(cityCode, []);
    return [];
  }
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

export function formatPhPhoneDisplay(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  let local = '';
  if (/^639\d{9}$/.test(digits)) local = `0${digits.slice(2)}`;
  else if (/^09\d{9}$/.test(digits)) local = digits;
  else if (/^9\d{9}$/.test(digits)) local = `0${digits}`;
  if (local) return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  return trimmed;
}

export function isValidPhPhone(raw?: string | null): boolean {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return true;
  const normalized = normalizePhPhone(trimmed);
  return /^\+639\d{9}$/.test(normalized);
}

export function splitAddressStreetAndBarangay(address?: string | null): { street: string; barangay: string } {
  const raw = String(address || '').trim();
  if (!raw) return { street: '', barangay: '' };
  const match = raw.match(/(?:^|,\s*)(?:brgy\.?|barangay)\s+([^,]+)$/i);
  if (match) {
    const barangay = match[1].trim();
    const street = raw.slice(0, match.index).replace(/,\s*$/, '').trim();
    return { street, barangay };
  }
  return { street: raw, barangay: '' };
}

export function combineAddressStreetAndBarangay(street?: string | null, barangay?: string | null): string {
  const s = String(street || '').trim();
  const b = String(barangay || '').trim().replace(/^(?:brgy\.?|barangay)\s+/i, '');
  return [s, b ? `Brgy. ${b}` : ''].filter(Boolean).join(', ');
}


