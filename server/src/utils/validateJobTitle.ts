const INVALID_JOB_TITLE_TERMS = new Set([
  'position',
  'current position',
  'job',
  'job title',
  'title',
  'role',
  'work',
  'working',
  'employed',
  'self employed',
  'self-employed',
  'unemployed',
  'seeking',
  'seeking opportunities',
  'retired',
  'employee',
  'worker',
  'staff',
  'na',
  'n/a',
  'none',
  'null',
  'nil',
  'nothing',
  'secret',
  'private',
  'confidential',
  'idk',
  'tbd',
  'tba',
  'test',
  'testing',
  'sample',
  'example',
  'asdf',
  'asdfgh',
  'qwerty',
  'zxcvbn',
  'hjkl',
  'yes',
  'no',
  'ok',
  'okay',
  'anything',
  'whatever',
  'someone',
  'unknown',
  'other',
  'others',
  'prefer not to say',
  'not applicable',
  'no answer',
  'wala',
  'secret lang',
  'ambot',
  'random',
  'hello',
  'hi',
  'hey',
  'bruh',
  'bro',
  'lol',
  'haha',
  'hehe',
  'blah',
  'foo',
  'bar',
  'baz',
  'lorem',
  'ipsum',
  'dummy',
  'fake',
  'botbot',
  'ewan',
  'basta',
  'organization',
  'company',
  'employer',
  'imong mama',
  'your mom',
  'yo mama',
  'ceo of being lazy-smart',
  'lazy-smart',
  'lazy smart',
]);

const JUNK_PHRASE_PATTERN = /\b(imong\s*mama|your\s*mom|yo\s*mama|being\s+lazy|lazy[- ]?smart)\b/i;

const KEYBOARD_MASH_PATTERN = /(asdf|qwer|zxcv|hjkl|uiop|fghj|dfgh|cvbn|tyui|ghjk)/i;

export function validateJobTitle(raw: unknown): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return { valid: false, cleaned: '', error: 'Please enter your job title (e.g., Software Engineer, Teacher).' };
  }

  const lower = cleaned.toLowerCase();
  const alphaOnly = lower.replace(/[^a-z0-9]/g, '');

  if (INVALID_JOB_TITLE_TERMS.has(lower) || INVALID_JOB_TITLE_TERMS.has(alphaOnly) || JUNK_PHRASE_PATTERN.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: `"${cleaned}" is not a valid job title. Please enter your actual role (e.g., Software Engineer, Teacher, Virtual Assistant).`,
    };
  }

  // Must be at least 2 characters and contain at least 2 letters
  const letters = cleaned.match(/[a-zA-Z]/g) || [];
  if (cleaned.length < 2 || letters.length < 2) {
    return {
      valid: false,
      cleaned,
      error: 'Job title must contain at least 2 letters (e.g., IT Support, Teacher).',
    };
  }

  // Reject repeated single character spam (e.g., "aaaa", "xxxx", "1111")
  if (/^(.)\1+$/i.test(alphaOnly) || /(.)\1{3,}/i.test(alphaOnly)) {
    return {
      valid: false,
      cleaned,
      error: 'Please enter a real job title instead of repeated characters.',
    };
  }

  if (KEYBOARD_MASH_PATTERN.test(alphaOnly)) {
    return {
      valid: false,
      cleaned,
      error: 'Please enter a real job title.',
    };
  }

  // Reject gibberish words (4+ letters with no vowels, or 6+ consecutive consonants)
  const words = cleaned.split(/\s+/);
  for (const w of words) {
    const lettersOnly = w.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length >= 4 && !/[aeiouy]/i.test(lettersOnly)) {
      return {
        valid: false,
        cleaned,
        error: `"${w}" does not look like a valid word in a job title.`,
      };
    }
    if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(lettersOnly)) {
      return {
        valid: false,
        cleaned,
        error: `"${w}" does not look like a valid job title.`,
      };
    }
  }

  // Only allow standard job title characters
  if (!/^[a-zA-Z0-9\s\-./,&()'+]+$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: 'Job title contains invalid characters.',
    };
  }

  return { valid: true, cleaned };
}

export const CANONICAL_INDUSTRIES = [
  'Information Technology',
  'Education / Academia',
  'Industrial & Manufacturing',
  'Engineering & Construction',
  'Business, Finance & BPO',
  'Hospitality & Tourism',
  'Government & Public Service',
  'Healthcare & Life Sciences',
  'Creative Arts & Media',
  'Other',
] as const;

const INDUSTRY_ALIASES: Record<string, string> = {
  'technology': 'Information Technology',
  'it': 'Information Technology',
  'information technology & software': 'Information Technology',
  'tech': 'Information Technology',
  'other industry': 'Other',
};

export function normalizeIndustry(raw: unknown): string | null {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const exact = CANONICAL_INDUSTRIES.find((ind) => ind.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  return INDUSTRY_ALIASES[cleaned.toLowerCase()] || null;
}

export const CANONICAL_SALARY_RANGES = [
  'Below ₱20,000',
  '₱20,000–₱40,000',
  '₱40,000–₱60,000',
  '₱60,000–₱80,000',
  '₱80,000–₱100,000',
  'Above ₱100,000',
  'Prefer not to say',
] as const;

export function normalizeSalaryRange(raw: unknown): string | null {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (['undisclosed', 'n/a', 'na', 'none', 'null', 'not reported', ''].includes(lower)) {
    return null;
  }
  const exact = CANONICAL_SALARY_RANGES.find((r) => r.toLowerCase() === lower);
  if (exact) return exact;

  if (lower === '10001-20000' || lower === 'below 20000' || lower === '<20000' || lower.includes('below')) {
    return 'Below ₱20,000';
  }
  if (lower === '20000-40000' || lower === '20001-40000') return '₱20,000–₱40,000';
  if (lower === '40000-60000' || lower === '40001-60000') return '₱40,000–₱60,000';
  if (lower === '60000-80000' || lower === '60001-80000') return '₱60,000–₱80,000';
  if (lower === '80000-100000' || lower === '80001-100000') return '₱80,000–₱100,000';

  const numericOnly = cleaned.replace(/[₱,\s]/g, '');
  if (/^\d+(\.\d+)?$/.test(numericOnly)) {
    const num = Number(numericOnly);
    if (num <= 0 || num >= 150000) return null; // Reject suspicious test outliers like 150000
    if (num < 20000) return 'Below ₱20,000';
    if (num <= 40000) return '₱20,000–₱40,000';
    if (num <= 60000) return '₱40,000–₱60,000';
    if (num <= 80000) return '₱60,000–₱80,000';
    if (num <= 100000) return '₱80,000–₱100,000';
    return 'Above ₱100,000';
  }
  return null;
}

const INVALID_COMPANY_TERMS = new Set([
  'organization',
  'company',
  'company name',
  'employer',
  'workplace',
  'position',
  'job',
  'title',
  'na',
  'n/a',
  'none',
  'null',
  'nil',
  'nothing',
  'secret',
  'private',
  'confidential',
  'idk',
  'tbd',
  'tba',
  'test',
  'testing',
  'sample',
  'example',
  'asdf',
  'qwerty',
  'unknown',
  'other',
  'wala',
  'ambot',
  'ewan',
  'basta',
  'imong mama',
]);

export function toTitleCaseCompanyName(raw: unknown): string {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const toWordCase = (word: string): string =>
    word.replace(/[A-Za-zÀ-ÖØ-öø-ÿ0-9']+/g, (segment) => {
      if (/^(II|III|IV|V)$/i.test(segment)) return segment.toUpperCase();
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    });

  const isAllUpper = /[A-ZÀ-ÖØ-Þ]/.test(cleaned) && cleaned === cleaned.toUpperCase();
  const isAllLower = /[a-zà-öø-ÿ]/.test(cleaned) && cleaned === cleaned.toLowerCase();

  if (isAllUpper || isAllLower) {
    return cleaned.split(' ').map(toWordCase).join(' ');
  }

  return cleaned
    .split(' ')
    .map((word) =>
      word.replace(/[A-Za-zÀ-ÖØ-öø-ÿ']+/g, (seg) => {
        if (seg.length > 1 && seg === seg.toLowerCase()) {
          if (/^(of|and|for|the|in|at|on|by|to|de|la)$/i.test(seg)) return seg;
          return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
        }
        return seg;
      })
    )
    .join(' ');
}

export function validateCompanyName(raw: unknown): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return { valid: false, cleaned: '', error: 'Please enter your company or organization name.' };
  }
  const lower = cleaned.toLowerCase();
  const alphaOnly = lower.replace(/[^a-z0-9]/g, '');
  if (INVALID_COMPANY_TERMS.has(lower) || INVALID_COMPANY_TERMS.has(alphaOnly) || JUNK_PHRASE_PATTERN.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: `"${cleaned}" is not a valid company name. Please enter your actual employer or business name.`,
    };
  }
  const letters = cleaned.match(/[a-zA-Z]/g) || [];
  if (cleaned.length < 2 || letters.length < 2) {
    return { valid: false, cleaned, error: 'Company name must contain at least 2 letters.' };
  }
  if (/^(.)\1+$/i.test(alphaOnly) || /(.)\1{3,}/i.test(alphaOnly) || KEYBOARD_MASH_PATTERN.test(alphaOnly)) {
    return { valid: false, cleaned, error: 'Please enter a valid company or organization name.' };
  }
  return { valid: true, cleaned: toTitleCaseCompanyName(cleaned) };
}

export function toTitleCaseName(raw: unknown): string {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((word) => {
      if (!word) return '';
      // Preserve Roman numerals II, III, IV, V
      if (/^(II|III|IV|V)$/i.test(word)) return word.toUpperCase();
      if (/^(Jr\.?|Sr\.?)$/i.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word
        .split('-')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''))
        .join('-');
    })
    .join(' ');
}

export function isOjtEmploymentRow(row: any): boolean {
  if (!row) return false;
  return (
    String(row.record_category || '').trim().toLowerCase() === 'ojt' ||
    String(row.job_type || '').trim().toLowerCase() === 'internship' ||
    String(row.employment_status || '').trim().toLowerCase() === 'ojt'
  );
}

export function validateStudentId(raw: unknown): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = String(raw ?? '').replace(/\s+/g, '').trim();
  if (!cleaned) {
    return { valid: false, cleaned: '', error: 'Student / Alumni ID is required.' };
  }
  // Accept standard 7-digit CTU ID (e.g. 1331234) or hyphenated CTU format (e.g. CTU-2021-0001 / 2021-0001)
  if (/^\d{7}$/.test(cleaned) || /^(CTU-)?\d{4}-\d{3,6}$/i.test(cleaned)) {
    return { valid: true, cleaned: cleaned.toUpperCase() };
  }
  if (/^\d{8,}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: 'Student ID has too many digits. Standard CTU Student IDs are 7 digits (e.g. 1334567).',
    };
  }
  return {
    valid: false,
    cleaned,
    error: 'Please enter a valid 7-digit CTU Student ID (e.g. 1334567) or formatted ID (e.g. CTU-2021-0001).',
  };
}

