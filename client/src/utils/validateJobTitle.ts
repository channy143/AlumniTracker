export const COMMON_JOB_TITLES = [
  'Software Engineer',
  'Web Developer',
  'Full-Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Mobile App Developer',
  'IT Support Specialist',
  'System Administrator',
  'Network Administrator',
  'Data Analyst',
  'UI/UX Designer',
  'Quality Assurance Engineer',
  'Customer Service Representative',
  'Technical Support Representative',
  'Call Center Agent',
  'Virtual Assistant',
  'Teacher',
  'ESL Teacher',
  'High School Teacher',
  'Elementary Teacher',
  'College Instructor',
  'Administrative Assistant',
  'HR Officer',
  'Accounting Staff',
  'Sales Associate',
  'Marketing Specialist',
  'Project Coordinator',
  'Operations Supervisor',
  'Electrician',
  'Technician',
  'Machine Operator',
  'Entrepreneur',
  'Business Owner',
  'Freelancer',
];

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

/**
 * Canonicalizes a job title by:
 * 1. Trimming and normalizing whitespace
 * 2. Proper title-casing words while preserving abbreviations (e.g. IT, OJT, STEM, QA, CAD, TLE, TVL, HR, CEO)
 * 3. Singularizing the final noun if pluralized (e.g. "Mathematics Teachers" -> "Mathematics Teacher", "Software Engineers" -> "Software Engineer")
 */
export function canonicalizeJobTitle(raw: unknown): string {
  const cleaned = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const words = cleaned.split(' ');
  if (words.length === 0) return '';

  const lastIndex = words.length - 1;
  let lastWord = words[lastIndex];

  // Common singular exceptions ending in 's' that should not be stripped
  const preservedEndings = /\b(analytics|logistics|robotics|physics|mathematics|economics|statistics|graphics|optics|informatics|electronics|mechanics|business|class|pass|boss|waitress|actress|hostess|stewardess|sales|campus|status|apparatus|series|species|operations)\b/i;

  if (!preservedEndings.test(lastWord)) {
    // If ends in "ies" and length > 4 (e.g., "secretaries" -> "secretary")
    if (/ies$/i.test(lastWord) && lastWord.length > 4) {
      lastWord = lastWord.replace(/ies$/i, 'y');
    }
    // If ends in "ses" where base is "se" (e.g., "nurses" -> "nurse", "licenses" -> "license")
    else if (/ses$/i.test(lastWord) && lastWord.length > 4) {
      lastWord = lastWord.replace(/s$/i, '');
    }
    // If ends in "ches", "shes", "xes", "zes" (e.g., "coaches" -> "coach")
    else if (/(ch|sh|x|z)es$/i.test(lastWord)) {
      lastWord = lastWord.replace(/es$/i, '');
    }
    // General plural ending in "s" (not "ss" or "us" or "is")
    // e.g. "teachers" -> "teacher", "engineers" -> "engineer", "developers" -> "developer"
    else if (/s$/i.test(lastWord) && !/ss$/i.test(lastWord) && !/us$/i.test(lastWord) && !/is$/i.test(lastWord) && lastWord.length > 3) {
      lastWord = lastWord.replace(/s$/i, '');
    }
  }

  words[lastIndex] = lastWord;

  // Title-case words while preserving known acronyms
  const ACRONYMS = new Set(['IT', 'OJT', 'STEM', 'QA', 'CAD', 'TLE', 'TVL', 'HR', 'CEO', 'CTO', 'CFO', 'COO', 'VP', 'BPO', 'SEO', 'UI', 'UX', 'AI', 'ML']);

  return words
    .map((word, idx) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      if (word === '&' || word === '/') return word;
      if (word.includes('/')) {
        return word.split('/').map(part => {
          const pUpper = part.toUpperCase();
          if (ACRONYMS.has(pUpper)) return pUpper;
          return part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '';
        }).join('/');
      }
      if (word.includes('-')) {
        return word.split('-').map(part => {
          const pUpper = part.toUpperCase();
          if (ACRONYMS.has(pUpper)) return pUpper;
          return part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '';
        }).join('-');
      }
      if (/^(and|of|in|at|for|the)$/i.test(word) && idx !== 0) {
        return word.toLowerCase();
      }
      return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '';
    })
    .join(' ');
}

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

  const letters = cleaned.match(/[a-zA-Z]/g) || [];
  if (cleaned.length < 2 || letters.length < 2) {
    return {
      valid: false,
      cleaned,
      error: 'Job title must contain at least 2 letters (e.g., IT Support, Teacher).',
    };
  }

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

  if (!/^[a-zA-Z0-9\s\-./,&()'+]+$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: 'Job title contains invalid characters.',
    };
  }

  return { valid: true, cleaned: canonicalizeJobTitle(cleaned) };
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

export const CANONICAL_SALARY_RANGES = [
  'Below ₱20,000',
  '₱20,000–₱40,000',
  '₱40,000–₱60,000',
  '₱60,000–₱80,000',
  '₱80,000+',
  '₱80,000 and above',
  '₱80,000–₱100,000',
  'Above ₱100,000',
  'Prefer not to say',
] as const;

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
  return { valid: true, cleaned };
}

