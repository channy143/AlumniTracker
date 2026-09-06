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
  'bscs': 'Bachelor of Science in Computer Science',
  'bsis': 'Bachelor of Science in Information Systems',
  'bit': 'Bachelor of Industrial Technology',
  'act': 'Associate in Computer Technology',

  // Education
  'beed': 'Bachelor of Elementary Education',
  'bsed': 'Bachelor of Secondary Education',
  'bsedmath': 'Bachelor of Secondary Education major in Mathematics',
  'bsedenglish': 'Bachelor of Secondary Education major in English',
  'bsedeng': 'Bachelor of Secondary Education major in English',
  'bsedfilipino': 'Bachelor of Secondary Education major in Filipino',
  'bsedfil': 'Bachelor of Secondary Education major in Filipino',
  'bsedscience': 'Bachelor of Secondary Education major in Science',
  'bsedsci': 'Bachelor of Secondary Education major in Science',
  'bsedsocial': 'Bachelor of Secondary Education major in Social Studies',
  'btled': 'Bachelor of Technology and Livelihood Education',
  'btledhe': 'Bachelor of Technology and Livelihood Education major in Home Economics',
  'btledict': 'Bachelor of Technology and Livelihood Education major in Information and Communications Technology',
  'btledia': 'Bachelor of Technology and Livelihood Education major in Industrial Arts',
  'btledafa': 'Bachelor of Technology and Livelihood Education major in Agri-Fishery Arts',
  'bped': 'Bachelor of Physical Education',
  'sned': 'Bachelor of Special Needs Education',
  'dpe': 'Diploma in Professional Education',

  // Business & Hospitality Management
  'bsba': 'Bachelor of Science in Business Administration',
  'bsbafm': 'Bachelor of Science in Business Administration major in Financial Management',
  'bsbamm': 'Bachelor of Science in Business Administration major in Marketing Management',
  'bsbahrm': 'Bachelor of Science in Business Administration major in Human Resource Management',
  'bsbahrdm': 'Bachelor of Science in Business Administration major in Human Resource Management',
  'bshm': 'Bachelor of Science in Hospitality Management',
  'bshrm': 'Bachelor of Science in Hotel and Restaurant Management',
  'bstm': 'Bachelor of Science in Tourism Management',
  'bsa': 'Bachelor of Science in Accountancy',
  'bsacc': 'Bachelor of Science in Accountancy',
  'bsaccountancy': 'Bachelor of Science in Accountancy',
  'bsma': 'Bachelor of Science in Management Accounting',
  'bpa': 'Bachelor of Public Administration',
  'bsrem': 'Bachelor of Science in Real Estate Management',
  'bsecon': 'Bachelor of Science in Economics',
  'abecon': 'Bachelor of Arts in Economics',
  'baecon': 'Bachelor of Arts in Economics',

  // Engineering & Technology
  'bsce': 'Bachelor of Science in Civil Engineering',
  'bsme': 'Bachelor of Science in Mechanical Engineering',
  'bsee': 'Bachelor of Science in Electrical Engineering',
  'bsece': 'Bachelor of Science in Electronics Engineering',
  'bscpe': 'Bachelor of Science in Computer Engineering',
  'bsie': 'Bachelor of Science in Industrial Engineering',
  'bse': 'Bachelor of Science in Environmental Engineering',
  'bsche': 'Bachelor of Science in Chemical Engineering',
  'bsarch': 'Bachelor of Science in Architecture',

  // Arts & Sciences
  'bscrim': 'Bachelor of Science in Criminology',
  'bscriminology': 'Bachelor of Science in Criminology',
  'bspsych': 'Bachelor of Science in Psychology',
  'bspsychology': 'Bachelor of Science in Psychology',
  'abpsych': 'Bachelor of Arts in Psychology',
  'abpolsci': 'Bachelor of Arts in Political Science',
  'bapolsci': 'Bachelor of Arts in Political Science',
  'polsci': 'Bachelor of Arts in Political Science',
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
  'bsmedtech': 'Bachelor of Science in Medical Laboratory Science',
  'bsmls': 'Bachelor of Science in Medical Laboratory Science',
  'bspharm': 'Bachelor of Science in Pharmacy',
  'bspharmacy': 'Bachelor of Science in Pharmacy',
  'bspt': 'Bachelor of Science in Physical Therapy',
  'bsnd': 'Bachelor of Science in Nutrition and Dietetics',
  'bsagri': 'Bachelor of Science in Agriculture',
  'bsagriculture': 'Bachelor of Science in Agriculture',
  'bsf': 'Bachelor of Science in Forestry',
  'bsforestry': 'Bachelor of Science in Forestry',
  'bsft': 'Bachelor of Science in Food Technology',
  'bsfisheries': 'Bachelor of Science in Fisheries',
};

/**
 * Normalizes any program string or abbreviation to its full canonical title.
 * If already a full title or unrecognized, cleans and returns the best representation.
 */
export function formatProgramLongName(rawProgram: string | null | undefined): string {
  if (!rawProgram) return '';
  const trimmed = rawProgram.trim();
  if (!trimmed) return '';

  const key = trimmed.toLowerCase().replace(/[\s\.\-_/]/g, '');
  if (PROGRAM_MAP[key]) {
    return PROGRAM_MAP[key];
  }

  if (/^bsed[\s\-_/]+math/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Mathematics';
  }
  if (/^bsed[\s\-_/]+eng/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in English';
  }
  if (/^bsed[\s\-_/]+fil/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Filipino';
  }
  if (/^bsed[\s\-_/]+sci/i.test(trimmed)) {
    return 'Bachelor of Secondary Education major in Science';
  }
  if (/^btled[\s\-_/]+he/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Home Economics';
  }
  if (/^btled[\s\-_/]+ict/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Information and Communications Technology';
  }
  if (/^btled[\s\-_/]+ia/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Industrial Arts';
  }
  if (/^btled[\s\-_/]+afa/i.test(trimmed)) {
    return 'Bachelor of Technology and Livelihood Education major in Agri-Fishery Arts';
  }
  if (/^bsba[\s\-_/]+(fm|finance|financial)/i.test(trimmed)) {
    return 'Bachelor of Science in Business Administration major in Financial Management';
  }
  if (/^bsba[\s\-_/]+(mm|marketing)/i.test(trimmed)) {
    return 'Bachelor of Science in Business Administration major in Marketing Management';
  }
  if (/^bsba[\s\-_/]+(hr|hrm|hrdm)/i.test(trimmed)) {
    return 'Bachelor of Science in Business Administration major in Human Resource Management';
  }

  if (/^(Bachelor|Master|Doctor|Associate|Diploma)\s+(of|in|to)\b/i.test(trimmed)) {
    return trimmed;
  }

  const bsMatch = trimmed.match(/^B\.?\s*S\.?\s+(?:in\s+)?(.+)$/i);
  if (bsMatch && bsMatch[1]) {
    const field = bsMatch[1].trim();
    if (!/^science\b/i.test(field)) {
      return `Bachelor of Science in ${field}`;
    }
  }

  const baMatch = trimmed.match(/^(?:B\.?\s*A\.?|A\.?\s*B\.?)\s+(?:in\s+)?(.+)$/i);
  if (baMatch && baMatch[1]) {
    const field = baMatch[1].trim();
    if (!/^arts\b/i.test(field)) {
      return `Bachelor of Arts in ${field}`;
    }
  }

  return trimmed;
}
