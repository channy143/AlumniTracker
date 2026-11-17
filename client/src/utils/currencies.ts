export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  label: string;
}

const FALLBACK_CURRENCY_CODES = [
  'PHP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'AED', 'SAR',
  'QAR', 'KWD', 'BHD', 'OMR', 'HKD', 'TWD', 'KRW', 'CNY', 'INR', 'MYR',
  'THB', 'IDR', 'VND', 'BND', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN',
  'CZK', 'HUF', 'RON', 'TRY', 'ILS', 'ZAR', 'BRL', 'MXN', 'ARS', 'CLP',
  'COP', 'PEN', 'EGP', 'NGN', 'KES', 'MAD', 'PKR', 'BDT', 'LKR', 'NPR',
  'MMK', 'KHR', 'LAK', 'RUB', 'UAH', 'ISK',
];

function getCurrencySymbol(code: string): string {
  if (code === 'PHP') return '₱';
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === 'currency')?.value;
    return sym || code;
  } catch {
    return code;
  }
}

function getAllCurrencyCodes(): string[] {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      const codes = intlAny.supportedValuesOf('currency');
      if (Array.isArray(codes) && codes.length > 0) {
        return Array.from(new Set(['PHP', ...codes]));
      }
    } catch {
      // Fall back to curated ISO list
    }
  }
  return FALLBACK_CURRENCY_CODES;
}

let cachedOptions: CurrencyOption[] | null = null;

export function getCurrencyOptions(): CurrencyOption[] {
  if (cachedOptions) return cachedOptions;

  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'currency' });
  } catch {
    displayNames = null;
  }

  const allCodes = getAllCurrencyCodes();
  const others = allCodes
    .filter((c) => c !== 'PHP')
    .sort((a, b) => a.localeCompare(b));

  const ordered = ['PHP', ...others];

  cachedOptions = ordered.map((code) => {
    const symbol = getCurrencySymbol(code);
    let name = code;
    try {
      name = (displayNames?.of(code) || code).trim();
    } catch {
      name = code;
    }
    const symDisplay = symbol && symbol !== code ? ` (${symbol})` : '';
    return {
      code,
      symbol,
      name,
      label: `${code}${symDisplay} — ${name}`,
    };
  });

  return cachedOptions;
}

function stripLeadingCurrency(part: string): string {
  return String(part || '')
    .trim()
    .replace(/^(?:PHP|USD|EUR|GBP|JPY|[A-Z]{3})\s+(?=[\d₱$€£¥₹₩฿₫])/i, '')
    .replace(/^[₱$€£¥₹₩฿₫]\s*/, '')
    .trim();
}

export function formatSalaryWithCurrency(currencyCode: string, rawRange: string): string | null {
  const code = (currencyCode || 'PHP').trim().toUpperCase();
  const trimmed = String(rawRange || '').trim();
  if (!trimmed) return null;

  const prefix = code === 'PHP' ? '₱' : `${code} `;
  const rangeParts = trimmed.split(/\s*(?:-|–|—|\bto\b)\s*/i);

  if (rangeParts.length === 2) {
    const left = stripLeadingCurrency(rangeParts[0]);
    const right = stripLeadingCurrency(rangeParts[1]);
    if (left && right && /^\d/.test(left) && /^\d/.test(right)) {
      return `${prefix}${left} - ${prefix}${right}`.slice(0, 50);
    }
  }

  const cleaned = stripLeadingCurrency(trimmed);
  if (!cleaned) return null;

  return `${prefix}${cleaned}`.slice(0, 50);
}

const SYMBOL_TO_CODE: Record<string, string> = {
  '₱': 'PHP',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
};

function stripBothBounds(raw: string): string {
  const parts = raw.split(/\s*(?:-|–|—|\bto\b)\s*/i);
  if (parts.length === 2) {
    const left = stripLeadingCurrency(parts[0]);
    const right = stripLeadingCurrency(parts[1]);
    if (left && right && /^\d/.test(left) && /^\d/.test(right)) {
      return `${left} - ${right}`;
    }
  }
  return stripLeadingCurrency(raw);
}

export function parseSalaryCurrencyAndRange(raw?: string | null): { currency: string; range: string } {
  const str = String(raw || '').trim();
  if (!str) return { currency: 'PHP', range: '' };

  for (const [sym, code] of Object.entries(SYMBOL_TO_CODE)) {
    if (str.startsWith(sym)) {
      return { currency: code, range: stripBothBounds(str) };
    }
  }

  const codeMatch = str.match(/^([A-Z]{3})\s+(.+)$/);
  if (codeMatch) {
    const knownCodes = new Set(getCurrencyOptions().map((c) => c.code));
    if (knownCodes.has(codeMatch[1])) {
      return { currency: codeMatch[1], range: stripBothBounds(str) };
    }
  }

  return { currency: 'PHP', range: stripBothBounds(str) };
}

export function formatJobSalaryDisplay(raw?: string | null): string | null {
  const str = String(raw || '').trim();
  if (!str) return null;
  if (/^\d/.test(str)) return `₱${str}`;
  return str;
}
