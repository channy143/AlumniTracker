export type ModerationCategory =
  | 'casual_chika'
  | 'gossip_slang'
  | 'greeting_smalltalk'
  | 'entertainment_hangout'
  | 'non_business_topic'
  | 'casual_emoji';

export interface MessageModerationResult {
  allowed: boolean;
  category?: ModerationCategory;
  categoryLabel?: string;
  reason?: string;
  userNotice?: string;
}

interface CasualRule {
  category: ModerationCategory;
  categoryLabel: string;
  reason: string;
  patterns: RegExp[];
}

const CASUAL_RULES: CasualRule[] = [
  {
    category: 'casual_chika',
    categoryLabel: 'Casual Conversation / Chika',
    reason: 'Casual chit-chat, "chika", or personal gossip is not permitted.',
    patterns: [
      /\bchika+\b/i,
      /\bchismis\b/i,
      /\btsismis\b/i,
      /\bmarites\b/i,
      /\blibak(an|ero|era)?\b/i,
      /\bintriga\b/i,
      /\bchuchu+\b/i,
      /\bchar(ot|ing|otz)?\b/i,
      /\bechos\b/i,
      /\bchos+\b/i,
      /\beme\b/i,
      /\bsana\s+all\b/i,
      /\bnaol\b/i,
      /\bawit\b/i,
      /\bskl\b/i,
      /\bspill\s+(the\s+)?tea\b/i,
      /\bgossip(ing)?\b/i,
      /\brumor(s)?\b/i,
    ],
  },
  {
    category: 'gossip_slang',
    categoryLabel: 'Informal Slang / Playful Chatter',
    reason: 'Informal jokes, slang, laughter filler, or romantic chatter are blocked in business conversations.',
    patterns: [
      /\b(ha){2,}h?\b/i,
      /\b(he){2,}h?\b/i,
      /\b(hi){2,}h?\b/i,
      /\b(hu){2,}h?\b/i,
      /\blol+s?\b/i,
      /\blmfao+\b/i,
      /\blmao+\b/i,
      /\brofl+\b/i,
      /\bjk\b/i,
      /\bjwk\b/i,
      /\bjust\s+kidding\b/i,
      /\bjoke\s+(lang|ra|only)\b/i,
      /\bwyd\b/i,
      /\bhru\b/i,
      /\bwassup\b/i,
      /\bwhat'?s\s+up\b/i,
      /\b(uyab|jowa|panguyab|nanliligaw|kilig)\b/i,
      /\bcrush\s+(nako|ko|kita|ka|mo)\b/i,
      /\bmy\s+crush\b/i,
      /\b(date\s+ta|date\s+tayo|blind\s+date|dinner\s+date|coffee\s+date|go\s+on\s+a\s+date)\b/i,
      /\b(my\s+ex|ex\s+nako|ex\s+ko|ex-?(bf|gf|boyfriend|girlfriend))\b/i,
      /\b(love\s+you|labyu|i\s+love\s+u|ily|mwah+|xoxo)\b/i,
      /\b(miss\s+you|miss\s+kita|mingaw\s+ko)\b/i,
      /\b(gwapo|gwapa|pogi|cute\s+(ka|mo|nimo)|single\s+ka\s+ba|taken\s+na\s+ka)\b/i,
      /\b(besh(ie)?|bestie|dzai|mars|mare|lods|lodi|lodz|tropa|barkada)\b/i,
      /\b(hugot|ootd|selfie|budol)\b/i,
    ],
  },
  {
    category: 'entertainment_hangout',
    categoryLabel: 'Entertainment / Social Hangout',
    reason: 'Personal hangouts, gaming, food trips, and entertainment chatter are outside alumni business scope.',
    patterns: [
      /\b(laag|suroy|lakwatsa|tambay)\b/i,
      /\b(inom\s+ta|inom\s+tayo|tagay|shot\s+ta|hubog|hangover|bartender\s+tonight)\b/i,
      /\b(karaoke|videoke|gimik|hangout|hang\s+out|chill\s+lang|unwind)\b/i,
      /\b(birthday\s+party|pool\s+party|house\s+party|party\s+ta|night\s+out)\b/i,
      /\b(kape\s+ta|kaon\s+ta|kain\s+tayo|samgyup|milk\s*tea|milktea|boba|food\s+trip|road\s+trip)\b/i,
      /\b(netflix|k-?drama|anime|manga|tiktok|showbiz|celebrity)\b/i,
      /\b(mlbb|mobile\s+legends|valorant|dota\s*2?|genshin|roblox|fortnite|codm|pubg|rank\s+game|ranked\s+game|duo\s+ta|mabar)\b/i,
      /\b(bored\s+(ko|kaayo|na|me)|laay|katugon|doka|sleepy|matulog|tulog\s+na)\b/i,
      /\b(what\s+did\s+you\s+eat|what\s+are\s+you\s+eating|unsay\s+sud-?an|kaon\s+na)\b/i,
      /\b(watch(ing)?\s+(a\s+)?movie|weekend\s+vibes)\b/i,
    ],
  },
  {
    category: 'greeting_smalltalk',
    categoryLabel: 'Unnecessary Small Talk / Bare Greeting',
    reason: 'Bare greetings or small talk without a business, career, or academic purpose are blocked.',
    patterns: [
      /\b(kumusta|kamusta|kmusta|musta(\s+na)?)\b/i,
      /\b(unsa(y)?\s+(balita|au|ayo|buhat|gibuhat|plano))\b/i,
      /\b(asa\s+(na\s+)?ka|diin\s+ka|saan\s+ka(\s+na)?|asa\s+ka\s+karon)\b/i,
      /\b(anong\s+balita|anong\s+ginagawa\s+mo|what\s+are\s+(you|u)\s+doing)\b/i,
      /\bhow\s+(are|r)\s+(you|u)(\s+doing|\s+today)?\b/i,
      /\bhow\s+have\s+you\s+been\b/i,
      /\blong\s+time\s+no\s+see\b/i,
    ],
  },
];

// Core CTU-Naga / Business / Career / Academic / Professional terms
const BUSINESS_KEYWORDS: RegExp[] = [
  // Careers & Employment
  /\b(job|jobs|career|careers|hiring|hire|hired|vacancy|vacancies|opening|openings|position|positions|role|roles|occupation|employment|unemployed|employed)\b/i,
  /\b(apply|applying|application|applicant|resume|cv|curriculum\s+vitae|cover\s+letter|portfolio|credential|credentials|qualification|qualifications)\b/i,
  /\b(interview|interviews|recruiter|recruitment|hr|human\s+resources|headhunter|onboarding|probation|offer|salary|compensation|benefits|payroll)\b/i,
  /\b(refer|referral|referrals|recommend|recommendation|endorse|endorsement|background\s+check)\b/i,
  /\b(intern|internship|internships|ojt|on-the-job\s+training|apprentice|apprenticeship|trainee|training)\b/i,
  /\b(full-?time|part-?time|remote|wfh|work\s+from\s+home|hybrid|freelance|freelancing|contractor|contract|consulting|consultant)\b/i,

  // Business & Organizational Work
  /\b(business|company|corporate|corporation|firm|agency|enterprise|startup|venture|organization|industry|sector)\b/i,
  /\b(client|clients|customer|customers|vendor|vendors|supplier|suppliers|partner|partnership|partnerships|stakeholder)\b/i,
  /\b(collaborate|collaboration|project|projects|proposal|proposals|pitch|quotation|quote|estimate|budget|invoice|billing|payment|procurement)\b/i,
  /\b(agreement|nda|mou|moa|scope|deliverable|deliverables|milestone|milestones|deadline|deadlines|timeline|roadmap|sprint)\b/i,
  /\b(marketing|sales|branding|strategy|operations|management|finance|accounting|audit|tax|bir|dti|sec|permit|compliance|policy|policies)\b/i,
  /\b(report|reports|presentation|deck|minutes|agenda|analytics|kpi|metrics|roi|revenue|profit)\b/i,
  /\b(office|department|division|supervisor|manager|director|executive|ceo|cto|founder|co-founder|employer|employee|staff|team|colleague|workplace|work)\b/i,

  // Professional Communication & Scheduling
  /\b(meeting|meetings|meet|call|zoom|google\s+meet|ms\s+teams|teams|webex|conference|appointment|schedule|scheduled|reschedule|availability|available)\b/i,
  /\b(inquiry|inquire|inquiring|follow-?up|follow\s+up|request|requesting|submit|submission|upload|attach|attached|attachment|document|documents|doc|pdf|file|files|spreadsheet)\b/i,
  /\b(review|approve|approval|verification|verify|confirm|confirmation|feedback|evaluation|assist|assistance|support|update)\b/i,
  /\b(email|gmail|linkedin|github|website|portal|link|form|forms|survey|tracer)\b/i,

  // Academic, University, Licensure & Alumni Matters
  /\b(ctu|cebu\s+technological|naga\s+campus|university|campus|college|school|dean|registrar|faculty|professor|instructor|teacher)\b/i,
  /\b(alumni|alumnus|alumna|graduate|graduates|graduation|batchmate|cohort|degree|diploma|transcript|tor|coe|good\s+moral|clearance|honor|honors|scholarship|grant)\b/i,
  /\b(thesis|capstone|research|journal|publication|study|course|curriculum|syllabus|enrollment|enrolled|major|bsit|bsed|beed|bsie|bsce|bsee|bsme|bshm|bit|btled)\b/i,
  /\b(board\s+exam|licensure|prc|let|ree|rme|cse|civil\s+service|certification|certified|certificate|license|seminar|webinar|workshop|symposium|forum|orientation|homecoming|event|program)\b/i,
  /\b(mentor|mentoring|mentorship|mentee|coach|coaching|advice|guidance|network|networking|opportunity|opportunities|upskill|skill|skills|experience)\b/i,

  // Technical / Trade Domains
  /\b(software|developer|development|engineering|engineer|programmer|coding|code|system|database|server|api|cloud|devops|cybersecurity|qa|testing|ui|ux|design|architecture)\b/i,
  /\b(technician|electrician|machinist|welding|welder|mechanical|civil|electrical|industrial|manufacturing|maintenance|safety|osha|bosh|cosh)\b/i,
];

// Concise workplace courtesy / confirmations allowed only when NO casual/chika terms appear
const PROFESSIONAL_COURTESY_ONLY: RegExp[] = [
  /^(noted|acknowledged|received|understood|approved|confirmed)([,\s]+(with\s+thanks|thank\s+you|thanks|sir|ma'?am|colleague|team))*[.!]?$/i,
  /^thank\s+you([,\s]+(very\s+much|so\s+much))?([,\s]+(for\s+(the|your)\s+.+|sir|ma'?am))?[.!]?$/i,
  /^thanks([,\s]+(for\s+(the|your)\s+.+|in\s+advance))?[.!]?$/i,
  /^(please\s+see\s+attached|kindly\s+check|will\s+do|i\s+will\s+get\s+back\s+to\s+you|i'?ll\s+check\s+and\s+update\s+you)[.!]?$/i,
];

// Bare greetings with no business substance
const BARE_GREETING_PATTERN =
  /^(hi+|hello+|hey+|heyy+|yo+|sup|howdy|good\s+(morning|afternoon|evening|day)|maayong\s+(buntag|hapon|gabii)|magandang\s+(umaga|hapon|gabi)|gm|gn|good\s+night|bye+|goodbye|see\s+(you|ya)|ttyl|brb|gtg|take\s+care|tc|ok(ay)?|k+|kk+|sige+|ge+|oo|yes|no|nope|yep|yup|sure|alright)[!.,\s]*$/i;

const PROFESSIONAL_EMOJI_SET = new Set(['👍', '👏', '🎓', '🚀', '🤝', '💼', '📄', '✅']);

function stripImageMarkup(raw: string): { hadImage: boolean; text: string } {
  const hasImage = /\[image:\s*[^\s\]]+\]/i.test(raw) || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(raw.trim());
  const text = raw
    .replace(/\[image:\s*[^\s\]]+\]/gi, '')
    .replace(/(^|\s)@[a-zA-Z0-9_.\-]+/g, ' ')
    .trim();
  return { hadImage: hasImage, text };
}

function isPureEmojis(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex =
    /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\uFE0F|\u200D)+/g;
  return trimmed.replace(emojiRegex, '').replace(/\s+/g, '').length === 0;
}

function countBusinessMatches(text: string): number {
  let count = 0;
  for (const rx of BUSINESS_KEYWORDS) {
    if (rx.test(text)) count += 1;
  }
  return count;
}

export function analyzeMessageRelevance(
  rawBody: string,
  subject?: string | null
): MessageModerationResult {
  const { hadImage, text } = stripImageMarkup(rawBody || '');

  // Shared post links or URLs (e.g., job posts, portfolios, shared feed links)
  const hasUrl = /https?:\/\/\S+/i.test(rawBody || '');
  if (hasUrl && !CASUAL_RULES.some((rule) => rule.patterns.some((p) => p.test(text)))) {
    return { allowed: true };
  }

  // Image attachment with no caption (e.g., resume screenshot, document photo, flyer)
  if (hadImage && !text) {
    return { allowed: true };
  }

  // Standalone emoji check
  if (isPureEmojis(text)) {
    const chars = Array.from(text.replace(/\s+/g, ''));
    const allProfessional = chars.length > 0 && chars.every((ch) => PROFESSIONAL_EMOJI_SET.has(ch));
    if (allProfessional) {
      return { allowed: true };
    }
    return {
      allowed: false,
      category: 'casual_emoji',
      categoryLabel: 'Casual Emoji / Non-Business Reaction',
      reason: 'Standalone casual emojis or waves without business context are blocked.',
      userNotice:
        'Message blocked due to standalone casual emoji. Please send a business, career, or alumni-related message.',
    };
  }

  const combinedForBusiness = [subject, text].filter(Boolean).join(' ').trim();
  const businessHits = countBusinessMatches(combinedForBusiness);

  // Check explicit casual / chika / gossip / hangout patterns
  let matchedCasualRule: CasualRule | null = null;
  let casualHitCount = 0;
  for (const rule of CASUAL_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        casualHitCount += 1;
        if (!matchedCasualRule) matchedCasualRule = rule;
      }
    }
  }

  // Hard block if casual/chika/gossip/entertainment terms are present without strong business dominance
  if (matchedCasualRule) {
    // Allow brief greetings like "how have you been" ONLY if strong business substance accompanies it (2+ distinct business signals & not gossip/slang/hangout)
    const isSoftGreetingOnly =
      matchedCasualRule.category === 'greeting_smalltalk' &&
      casualHitCount <= 1 &&
      businessHits >= 2;

    if (!isSoftGreetingOnly) {
      return {
        allowed: false,
        category: matchedCasualRule.category,
        categoryLabel: matchedCasualRule.categoryLabel,
        reason: matchedCasualRule.reason,
        userNotice: `Message blocked due to ${matchedCasualRule.categoryLabel.toLowerCase()}: ${matchedCasualRule.reason}`,
      };
    }
  }

  // Block bare greetings / one-word casual acknowledgments
  if (BARE_GREETING_PATTERN.test(text)) {
    return {
      allowed: false,
      category: 'greeting_smalltalk',
      categoryLabel: 'Unnecessary Small Talk / Bare Greeting',
      reason: 'Short casual greetings or replies without a business, career, or academic topic are not allowed.',
      userNotice:
        'Message blocked due to bare greeting or small talk. Please include your career, academic, or business inquiry.',
    };
  }

  // Allow formal workplace confirmations
  if (PROFESSIONAL_COURTESY_ONLY.some((rx) => rx.test(text))) {
    return { allowed: true };
  }

  // Require at least 1 business/career/academic/alumni signal in general messages
  if (businessHits === 0) {
    return {
      allowed: false,
      category: 'non_business_topic',
      categoryLabel: 'Off-Topic / Non-Business Conversation',
      reason:
        'No business, career, academic, or official alumni topic detected. Casual or unnecessary conversation is blocked.',
      userNotice:
        'Message blocked due to non-business or unnecessary conversation. Alumni Messaging is strictly for career, job referrals, academic, or business discussions.',
    };
  }

  return { allowed: true };
}
