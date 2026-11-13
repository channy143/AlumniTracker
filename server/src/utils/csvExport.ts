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
export function buildDpaCsv(rows: Record<string, any>[], headersOverride?: string[]): string {
  const prefix = '\ufeff' + DPA_CSV_WATERMARK;
  if (rows.length === 0) {
    if (headersOverride && headersOverride.length > 0) {
      return prefix + headersOverride.map(escapeCsvCell).join(',') + '\n';
    }
    return prefix + '# No records found\n';
  }
  const headers = headersOverride && headersOverride.length > 0 ? headersOverride : Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((r) => headers.map((h) => escapeCsvCell(r[h])).join(','));
  return prefix + [headerLine, ...dataLines].join('\n');
}

