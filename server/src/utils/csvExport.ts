/**
 * Shared CSV export utility with RA 10173 Data Privacy Notice,
 * UTF-8 BOM for Excel compatibility, RFC 4180 quoting, and
 * formula-injection sanitization (CWE-1236).
 */

export const DPA_CSV_WATERMARK =
  '# -----------------------------------------------------------------------------\n' +
  '# CONFIDENTIALITY & DATA PRIVACY NOTICE (RULE 5 & REPUBLIC ACT NO. 10173)\n' +
  '# CTU-Naga Alumni Connect — Centralized Career Analytics & Alumni Records\n' +
  '# This report contains protected alumni personal and career information.\n' +
  '# Unauthorized copying, disclosure, or distribution is strictly prohibited.\n' +
  '# Exported for authorized institutional analytics only. Store securely.\n' +
  '# -----------------------------------------------------------------------------\n';

/**
 * Escapes a CSV cell value according to RFC 4180 and neutralizes
 * spreadsheet formula injection characters (=, +, -, @, tab, CR).
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Neutralize formula injection while preserving plain negative numbers
  if (/^[=+\-@\t\r]/.test(str) && !/^-\d+(\.\d+)?$/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Builds an Excel-safe UTF-8 CSV string with RA 10173 DPA header notice.
 */
const ALPHABETICAL_KEY_PRIORITY = [
  'full name',
  'alumni name',
  'name',
  'student name',
  'respondent name',
  'employer name',
  'company name',
  'company',
  'program',
  'degree program',
  'course',
  'skill',
  'skill name',
  'job title',
  'position',
  'survey title',
  'title',
  'industry',
  'salary range',
  'batch',
  'graduation year',
  'metric',
  'category',
  'actor',
  'action',
  'email address',
  'email',
];

function compareStringsAlphabetically(aVal: unknown, bVal: unknown): number {
  const aStr = aVal == null ? '' : String(aVal).trim();
  const bStr = bVal == null ? '' : String(bVal).trim();
  if (!aStr && !bStr) return 0;
  if (!aStr) return 1;
  if (!bStr) return -1;
  return aStr.localeCompare(bStr, undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Returns a new array of report rows sorted alphabetically by the primary
 * name/label column (Last Name + First Name when present, otherwise the highest
 * priority human-readable label column, falling back to the first column).
 */
export function sortRowsAlphabetically<T extends Record<string, any>>(rows: T[]): T[] {
  if (rows.length <= 1) return [...rows];

  const keys = Object.keys(rows[0]);
  if (keys.length === 0) return [...rows];

  const normalizedKeyMap = new Map<string, string>();
  for (const k of keys) {
    const norm = k.toLowerCase().replace(/_/g, ' ').trim();
    if (!normalizedKeyMap.has(norm)) normalizedKeyMap.set(norm, k);
  }

  const lastNameKey = normalizedKeyMap.get('last name');
  const firstNameKey = normalizedKeyMap.get('first name');
  if (lastNameKey && firstNameKey) {
    return [...rows].sort((a, b) => {
      const lastCmp = compareStringsAlphabetically(a[lastNameKey], b[lastNameKey]);
      if (lastCmp !== 0) return lastCmp;
      return compareStringsAlphabetically(a[firstNameKey], b[firstNameKey]);
    });
  }

  let sortKey = keys[0];
  for (const candidate of ALPHABETICAL_KEY_PRIORITY) {
    const matched = normalizedKeyMap.get(candidate);
    if (matched) {
      sortKey = matched;
      break;
    }
  }

  return [...rows].sort((a, b) => compareStringsAlphabetically(a[sortKey], b[sortKey]));
}

export function buildDpaCsv(rows: Record<string, any>[], headersOverride?: string[]): string {
  const prefix = '\ufeff' + DPA_CSV_WATERMARK;
  if (rows.length === 0) {
    if (headersOverride && headersOverride.length > 0) {
      return prefix + headersOverride.map(escapeCsvCell).join(',') + '\n';
    }
    return prefix + '# No records found\n';
  }
  const sortedRows = sortRowsAlphabetically(rows);
  const headers = headersOverride && headersOverride.length > 0 ? headersOverride : Object.keys(sortedRows[0]);
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = sortedRows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(','));
  return prefix + [headerLine, ...dataLines].join('\n');
}

