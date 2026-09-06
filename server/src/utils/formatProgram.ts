/**
 * Maps short program names / acronyms into their full canonical program titles.
 * Examples:
 *   'BSIT' -> 'Bachelor of Science in Information Technology'
 *   'BEEd' -> 'Bachelor of Elementary Education'
 *   'BSEd' -> 'Bachelor of Secondary Education'
 *   'BSCS' -> 'Bachelor of Science in Computer Science'
 */

const PROGRAM_MAP: Record<string, string> = {
  // Information & Computing Sciences
  'bsit': 'Bachelor of Science in Information Technology',
  'it': 'Bachelor of Science in Information Technology',
  'informationtechnology': 'Bachelor of Science in Information Technology',
  'bscs': 'Bachelor of Science in Computer Science',
  'cs': 'Bachelor of Science in Computer Science',
  'computerscience': 'Bachelor of Science in Computer Science',
  'bsis': 'Bachelor of Science in Information Systems',
  'is': 'Bachelor of Science in Information Systems',
  'informationsystems': 'Bachelor of Science in Information Systems',
  'act': 'Associate in Computer Technology',
  'associateincomputertechnology': 'Associate in Computer Technology',

  // Industrial Technology
  'bit': 'Bachelor of Industrial Technology',
  'industrialtechnology': 'Bachelor of Industrial Technology',
  'bitauto': 'Bachelor of Industrial Technology major in Automotive Technology',
  'bitautomotive': 'Bachelor of Industrial Technology major in Automotive Technology',
  'bitautomotivetechnology': 'Bachelor of Industrial Technology major in Automotive Technology',
  'bitelec': 'Bachelor of Industrial Technology major in Electrical Technology',
  'bitelectrical': 'Bachelor of Industrial Technology major in Electrical Technology',
  'bitelectricaltechnology': 'Bachelor of Industrial Technology major in Electrical Technology',
  'bitelectronics': 'Bachelor of Industrial Technology major in Electronics Technology',
  'bitelectronicstechnology': 'Bachelor of Industrial Technology major in Electronics Technology',
  'bitet': 'Bachelor of Industrial Technology major in Electronics Technology',
  'bitdrafting': 'Bachelor of Industrial Technology major in Drafting Technology',
  'bitdraftingtechnology': 'Bachelor of Industrial Technology major in Drafting Technology',
  'bitdraft': 'Bachelor of Industrial Technology major in Drafting Technology',
  'bitmech': 'Bachelor of Industrial Technology major in Mechanical Technology',
  'bitmechanical': 'Bachelor of Industrial Technology major in Mechanical Technology',
  'bitmechanicaltechnology': 'Bachelor of Industrial Technology major in Mechanical Technology',
  'bitcivil': 'Bachelor of Industrial Technology major in Civil Technology',
  'bitciviltechnology': 'Bachelor of Industrial Technology major in Civil Technology',
  'bitfood': 'Bachelor of Industrial Technology major in Food Technology',
  'bitfoods': 'Bachelor of Industrial Technology major in Food Technology',
  'bitfoodtech': 'Bachelor of Industrial Technology major in Food Technology',
  'bitfoodtechnology': 'Bachelor of Industrial Technology major in Food Technology',
  'bitgarments': 'Bachelor of Industrial Technology major in Garments and Fashion Design',
  'bitfashion': 'Bachelor of Industrial Technology major in Garments and Fashion Design',
  'bitgarmenttechnology': 'Bachelor of Industrial Technology major in Garments and Fashion Design',
  'bitcomputer': 'Bachelor of Industrial Technology major in Computer Technology',
  'bitcomputertechnology': 'Bachelor of Industrial Technology major in Computer Technology',
  'bitct': 'Bachelor of Industrial Technology major in Computer Technology',
  'bitwelding': 'Bachelor of Industrial Technology major in Welding and Fabrication Technology',
  'bitfabrication': 'Bachelor of Industrial Technology major in Welding and Fabrication Technology',
  'bitweldingandfabrication': 'Bachelor of Industrial Technology major in Welding and Fabrication Technology',

  // Education
  'beed': 'Bachelor of Elementary Education',
  'elementaryeducation': 'Bachelor of Elementary Education',
  'bsed': 'Bachelor of Secondary Education',
  'secondaryeducation': 'Bachelor of Secondary Education',
  'bsedmath': 'Bachelor of Secondary Education major in Mathematics',
  'bsedmathematics': 'Bachelor of Secondary Education major in Mathematics',
  'bsedenglish': 'Bachelor of Secondary Education major in English',
  'bsedeng': 'Bachelor of Secondary Education major in English',
  'bsedfilipino': 'Bachelor of Secondary Education major in Filipino',
  'bsedfil': 'Bachelor of Secondary Education major in Filipino',
  'bsedscience': 'Bachelor of Secondary Education major in Science',
  'bsedsci': 'Bachelor of Secondary Education major in Science',
  'bsedsocial': 'Bachelor of Secondary Education major in Social Studies',
  'bsedsoc': 'Bachelor of Secondary Education major in Social Studies',
  'bsedsocialstudies': 'Bachelor of Secondary Education major in Social Studies',
  'bsedvalues': 'Bachelor of Secondary Education major in Values Education',
  'bsedve': 'Bachelor of Secondary Education major in Values Education',
  'btled': 'Bachelor of Technology and Livelihood Education',
  'btledhe': 'Bachelor of Technology and Livelihood Education major in Home Economics',
  'btledhomeeconomics': 'Bachelor of Technology and Livelihood Education major in Home Economics',
  'btledict': 'Bachelor of Technology and Livelihood Education major in Information and Communications Technology',
  'btledia': 'Bachelor of Technology and Livelihood Education major in Industrial Arts',
  'btledindustrialarts': 'Bachelor of Technology and Livelihood Education major in Industrial Arts',
  'btledafa': 'Bachelor of Technology and Livelihood Education major in Agri-Fishery Arts',
  'btledagri': 'Bachelor of Technology and Livelihood Education major in Agri-Fishery Arts',
  'bped': 'Bachelor of Physical Education',
  'sned': 'Bachelor of Special Needs Education',
  'dpe': 'Diploma in Professional Education',

  // Business & Hospitality Management
  'bsba': 'Bachelor of Science in Business Administration',
  'businessadministration': 'Bachelor of Science in Business Administration',
  'bsbafm': 'Bachelor of Science in Business Administration major in Financial Management',
  'bsbafinance': 'Bachelor of Science in Business Administration major in Financial Management',
  'bsbafinancialmanagement': 'Bachelor of Science in Business Administration major in Financial Management',
  'bsbamm': 'Bachelor of Science in Business Administration major in Marketing Management',
  'bsbamarketing': 'Bachelor of Science in Business Administration major in Marketing Management',
  'bsbamarketingmanagement': 'Bachelor of Science in Business Administration major in Marketing Management',
  'bsbahrm': 'Bachelor of Science in Business Administration major in Human Resource Management',
  'bsbahrdm': 'Bachelor of Science in Business Administration major in Human Resource Management',
  'bsbahumanresource': 'Bachelor of Science in Business Administration major in Human Resource Management',
  'bsbaom': 'Bachelor of Science in Business Administration major in Operations Management',
  'bshm': 'Bachelor of Science in Hospitality Management',
  'hospitalitymanagement': 'Bachelor of Science in Hospitality Management',
  'bshrm': 'Bachelor of Science in Hotel and Restaurant Management',
  'hotelrestaurantmanagement': 'Bachelor of Science in Hotel and Restaurant Management',
  'bstm': 'Bachelor of Science in Tourism Management',
  'tourismmanagement': 'Bachelor of Science in Tourism Management',
  'bsa': 'Bachelor of Science in Accountancy',
  'bsacc': 'Bachelor of Science in Accountancy',
  'bsaccountancy': 'Bachelor of Science in Accountancy',
  'accountancy': 'Bachelor of Science in Accountancy',
  'bsma': 'Bachelor of Science in Management Accounting',
  'bpa': 'Bachelor of Public Administration',
  'bsrem': 'Bachelor of Science in Real Estate Management',
  'bsecon': 'Bachelor of Science in Economics',
  'abecon': 'Bachelor of Arts in Economics',
  'baecon': 'Bachelor of Arts in Economics',

  // Engineering & Technology
  'bsce': 'Bachelor of Science in Civil Engineering',
  'civilengineering': 'Bachelor of Science in Civil Engineering',
  'bsme': 'Bachelor of Science in Mechanical Engineering',
  'mechanicalengineering': 'Bachelor of Science in Mechanical Engineering',
  'bsee': 'Bachelor of Science in Electrical Engineering',
  'electricalengineering': 'Bachelor of Science in Electrical Engineering',
  'bsece': 'Bachelor of Science in Electronics Engineering',
  'electronicsengineering': 'Bachelor of Science in Electronics Engineering',
  'bscpe': 'Bachelor of Science in Computer Engineering',
  'computerengineering': 'Bachelor of Science in Computer Engineering',
  'bsie': 'Bachelor of Science in Industrial Engineering',
  'industrialengineering': 'Bachelor of Science in Industrial Engineering',
  'bse': 'Bachelor of Science in Environmental Engineering',
  'bsche': 'Bachelor of Science in Chemical Engineering',
  'bsarch': 'Bachelor of Science in Architecture',

  // Arts & Sciences
  'bscrim': 'Bachelor of Science in Criminology',
  'bscriminology': 'Bachelor of Science in Criminology',
  'criminology': 'Bachelor of Science in Criminology',
  'bspsych': 'Bachelor of Science in Psychology',
  'bspsychology': 'Bachelor of Science in Psychology',
  'psychology': 'Bachelor of Science in Psychology',
  'abpsych': 'Bachelor of Arts in Psychology',
  'abpolsci': 'Bachelor of Arts in Political Science',
  'bapolsci': 'Bachelor of Arts in Political Science',
  'polsci': 'Bachelor of Arts in Political Science',
  'politicalscience': 'Bachelor of Arts in Political Science',
  'abcomm': 'Bachelor of Arts in Communication',
  'bacomm': 'Bachelor of Arts in Communication',
  'abeng': 'Bachelor of Arts in English Language',
  'baeng': 'Bachelor of Arts in English Language',
  'abenglish': 'Bachelor of Arts in English Language',
  'ablit': 'Bachelor of Arts in Literature',
  'balit': 'Bachelor of Arts in Literature',
  'bsmath': 'Bachelor of Science in Mathematics',
  'bsmathematics': 'Bachelor of Science in Mathematics',
  'bsbio': 'Bachelor of Science in Biology',
  'bsbiology': 'Bachelor of Science in Biology',
  'bschem': 'Bachelor of Science in Chemistry',
  'bschemistry': 'Bachelor of Science in Chemistry',
  'bsphy': 'Bachelor of Science in Physics',
  'bsphysics': 'Bachelor of Science in Physics',

  // Health Sciences & Agriculture
  'bsn': 'Bachelor of Science in Nursing',
  'bsnursing': 'Bachelor of Science in Nursing',
  'nursing': 'Bachelor of Science in Nursing',
  'bsmedtech': 'Bachelor of Science in Medical Laboratory Science',
  'bsmls': 'Bachelor of Science in Medical Laboratory Science',
  'bspharm': 'Bachelor of Science in Pharmacy',
  'bspharmacy': 'Bachelor of Science in Pharmacy',
  'bspt': 'Bachelor of Science in Physical Therapy',
  'bsnd': 'Bachelor of Science in Nutrition and Dietetics',
  'bsagri': 'Bachelor of Science in Agriculture',
  'bsagriculture': 'Bachelor of Science in Agriculture',
  'agriculture': 'Bachelor of Science in Agriculture',
  'bsf': 'Bachelor of Science in Forestry',
  'bsforestry': 'Bachelor of Science in Forestry',
  'forestry': 'Bachelor of Science in Forestry',
  'bsft': 'Bachelor of Science in Food Technology',
  'bsfisheries': 'Bachelor of Science in Fisheries',
};

/**
 * Normalizes any program string or abbreviation to its full canonical title.
 * If already a full title or unrecognized, cleans and returns the best representation.
 */
export function formatProgramLongName(rawProgram: string | null | undefined): string {
  if (!rawProgram) return '';
  let trimmed = rawProgram.trim();
  if (!trimmed) return '';

  // Handle batch suffix if embedded inside the program string, e.g. "BSIT (Batch 2026)"
  let batchSuffix = '';
  const batchMatch = trimmed.match(/\s*(?:\(|-\s*)?Batch\s+(\d{4})\)?$/i);
  if (batchMatch) {
    batchSuffix = ` (Batch ${batchMatch[1]})`;
    trimmed = trimmed.replace(/\s*(?:\(|-\s*)?Batch\s+(\d{4})\)?$/i, '').trim();
  }

  // Handle parenthetical acronyms or full names, e.g.
  // "Bachelor of Science in Information Technology (BSIT)" -> "Bachelor of Science in Information Technology"
  // "BSIT (Bachelor of Science in Information Technology)" -> "Bachelor of Science in Information Technology"
  const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const part1 = parenMatch[1].trim();
    const part2 = parenMatch[2].trim();
    if (/^(Bachelor|Master|Doctor|Associate|Diploma)\s+(of|in|to)\b/i.test(part2)) {
      trimmed = part2;
    } else if (/^(Bachelor|Master|Doctor|Associate|Diploma)\s+(of|in|to)\b/i.test(part1)) {
      trimmed = part1;
    }
  }

  // Check normalized key without spaces, dots, hyphens, slashes
  const key = trimmed.toLowerCase().replace(/[\s\.\-_/]/g, '');
  if (PROGRAM_MAP[key]) {
    return PROGRAM_MAP[key] + batchSuffix;
  }

  // Handle BIT with majors (e.g. "BIT - Automotive", "BIT in Electrical", "BIT Major in Drafting")
  const bitMajorMatch = trimmed.match(/^bit[\s\-_/]+(?:major\s+in\s+|in\s+)?(.+)$/i);
  if (bitMajorMatch && bitMajorMatch[1]) {
    const majorRaw = bitMajorMatch[1].trim();
    const majorKey = 'bit' + majorRaw.toLowerCase().replace(/[\s\.\-_/]/g, '');
    if (PROGRAM_MAP[majorKey]) {
      return PROGRAM_MAP[majorKey] + batchSuffix;
    }
    const cleanMajor = majorRaw.replace(/technology$/i, '').trim();
    return `Bachelor of Industrial Technology major in ${cleanMajor} Technology` + batchSuffix;
  }

  // Handle common compound formats like "BSEd - Math", "BSEd Major in Math"
  if (/^bsed[\s\-_/]+(math|mathematics)/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Mathematics' + batchSuffix;
  }
  if (/^bsed[\s\-_/]+(eng|english)/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in English' + batchSuffix;
  }
  if (/^bsed[\s\-_/]+(fil|filipino)/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Filipino' + batchSuffix;
  }
  if (/^bsed[\s\-_/]+(sci|science)/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Science' + batchSuffix;
  }
  if (/^bsed[\s\-_/]+(soc|social|socialstudies)/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Social Studies' + batchSuffix;
  }
  if (/^btled[\s\-_/]+(he|homeeconomics)/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Home Economics' + batchSuffix;
  }
  if (/^btled[\s\-_/]+ict/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Information and Communications Technology' + batchSuffix;
  }
  if (/^btled[\s\-_/]+(ia|industrialarts)/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Industrial Arts' + batchSuffix;
  }
  if (/^btled[\s\-_/]+(afa|agri|agrifishery)/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Agri-Fishery Arts' + batchSuffix;
  }
  if (/^bsba[\s\-_/]+(fm|finance|financial)/i.test(trimmed)) {
    return 'Bachelor of Science in Business Administration major in Financial Management' + batchSuffix;
  }
  if (/^bsba[\s\-_/]+(mm|marketing)/i.test(trimmed)) {
    return 'Bachelor of Science in Business Administration major in Marketing Management' + batchSuffix;
  }
  if (/^bsba[\s\-_/]+(hr|hrm|hrdm|humanresource)/i.test(trimmed)) {
    return 'Bachelor of Science in Business Administration major in Human Resource Management' + batchSuffix;
  }

  // Handle "Bachelor of Science in IT" -> "Bachelor of Science in Information Technology"
  if (/^bachelor\s+of\s+science\s+in\s+it$/i.test(trimmed)) {
    return 'Bachelor of Science in Information Technology' + batchSuffix;
  }
  if (/^bachelor\s+of\s+science\s+in\s+cs$/i.test(trimmed)) {
    return 'Bachelor of Science in Computer Science' + batchSuffix;
  }
  if (/^bachelor\s+of\s+science\s+in\s+is$/i.test(trimmed)) {
    return 'Bachelor of Science in Information Systems' + batchSuffix;
  }

  // If already starts with Bachelor of, Bachelor in, Master, Doctor: return trimmed
  if (/^(Bachelor|Master|Doctor|Associate|Diploma)\s+(of|in|to)\b/i.test(trimmed)) {
    const cleaned = trimmed.replace(/\s*\([A-Za-z0-9\s-]+\)$/, '').trim();
    return cleaned + batchSuffix;
  }

  // Handle prefix expansions like "BS Information Technology" -> "Bachelor of Science in Information Technology"
  const bsMatch = trimmed.match(/^B\.?\s*S\.?\s+(?:in\s+)?(.+)$/i);
  if (bsMatch && bsMatch[1]) {
    const field = bsMatch[1].trim();
    if (/^it$/i.test(field) || /^information\s+technology$/i.test(field)) {
      return 'Bachelor of Science in Information Technology' + batchSuffix;
    }
    if (/^cs$/i.test(field) || /^computer\s+science$/i.test(field)) {
      return 'Bachelor of Science in Computer Science' + batchSuffix;
    }
    if (/^is$/i.test(field) || /^information\s+systems$/i.test(field)) {
      return 'Bachelor of Science in Information Systems' + batchSuffix;
    }
    if (!/^science\b/i.test(field)) {
      return `Bachelor of Science in ${field}` + batchSuffix;
    }
  }

  const baMatch = trimmed.match(/^(?:B\.?\s*A\.?|A\.?\s*B\.?)\s+(?:in\s+)?(.+)$/i);
  if (baMatch && baMatch[1]) {
    const field = baMatch[1].trim();
    if (!/^arts\b/i.test(field)) {
      return `Bachelor of Arts in ${field}` + batchSuffix;
    }
  }

  return trimmed + batchSuffix;
}
