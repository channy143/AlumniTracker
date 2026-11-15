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
]);

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

  if (INVALID_JOB_TITLE_TERMS.has(lower) || INVALID_JOB_TITLE_TERMS.has(alphaOnly)) {
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

