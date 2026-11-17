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

export function formatSalaryWithCurrency(currencyCode: string, rawRange: string): string | null {
  const code = (currencyCode || 'PHP').trim().toUpperCase();
  const trimmed = String(rawRange || '').trim();
  if (!trimmed) return null;

  // Strip accidental leading currency code/symbol already typed by user
  const cleaned = trimmed
    .replace(/^(?:PHP|USD|EUR|GBP|JPY|[A-Z]{3})\s+/i, '')
    .replace(/^[₱$€£¥₹₩฿₫]\s*/, '')
    .trim();

  if (!cleaned) return null;

  const formatted = code === 'PHP' ? `₱${cleaned}` : `${code} ${cleaned}`;
  return formatted.slice(0, 50);
}

const SYMBOL_TO_CODE: Record<string, string> = {
  '₱': 'PHP',
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
};

export function parseSalaryCurrencyAndRange(raw?: string | null): { currency: string; range: string } {
  const str = String(raw || '').trim();
  if (!str) return { currency: 'PHP', range: '' };

  for (const [sym, code] of Object.entries(SYMBOL_TO_CODE)) {
    if (str.startsWith(sym)) {
      return { currency: code, range: str.slice(sym.length).trim() };
    }
  }

  const codeMatch = str.match(/^([A-Z]{3})\s+(.+)$/);
  if (codeMatch) {
    const knownCodes = new Set(getCurrencyOptions().map((c) => c.code));
    if (knownCodes.has(codeMatch[1])) {
      return { currency: codeMatch[1], range: codeMatch[2].trim() };
    }
  }

  return { currency: 'PHP', range: str };
}

export function formatJobSalaryDisplay(raw?: string | null): string | null {
  const str = String(raw || '').trim();
  if (!str) return null;
  if (/^\d/.test(str)) return `₱${str}`;
  return str;
}
