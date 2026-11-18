import * as XLSX from 'xlsx';

/**
 * Clean and truncate an Excel worksheet name to adhere to Microsoft Excel's
 * 31-character limit and forbidden character rules: \ / ? * [ ] :
 */
export function sanitizeSheetName(name: string, existingNames: Set<string> = new Set()): string {
  let clean = String(name || 'Sheet')
    .replace(/[\\/?*\[\]:]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);

  if (!clean) clean = 'Sheet';

  let candidate = clean;
  let counter = 1;
  while (existingNames.has(candidate.toLowerCase())) {
    const suffix = ` (${counter++})`;
    candidate = clean.slice(0, 31 - suffix.length) + suffix;
  }

  existingNames.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Apply auto-fit column widths (!cols) and comfortable row heights (!rows)
 * to a SheetJS worksheet so text and headers have ample breathing room and
 * are never truncated or cramped in Microsoft Excel or Google Sheets.
 */
export function applyWorksheetSpacing(
  ws: XLSX.WorkSheet,
  minColWidth = 14,
  maxColWidth = 65,
  padding = 4
): XLSX.WorkSheet {
  if (!ws || !ws['!ref']) return ws;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths: { wch: number }[] = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 0;

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = ws[cellAddress];
      if (!cell || cell.v === undefined || cell.v === null) continue;

      // Extract formatted or raw display value
      const strVal = String(cell.w ?? cell.v ?? '');
      // Handle multiline cell values by checking the longest line
      const lines = strVal.split('\n');
      for (const line of lines) {
        const len = line.trim().length;
        if (len > maxLen) {
          maxLen = len;
        }
      }
    }

    // Auto-fit width with padding, bounded by min and max
    const calculatedWidth = Math.min(Math.max(maxLen + padding, minColWidth), maxColWidth);
    colWidths.push({ wch: calculatedWidth });
  }

  ws['!cols'] = colWidths;

  // Comfortable row heights: 24pt for table header, 20pt for data rows
  const rowHeights: { hpt: number }[] = [];
  rowHeights.push({ hpt: 24 });
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    rowHeights.push({ hpt: 20 });
  }
  ws['!rows'] = rowHeights;

  return ws;
}

/**
 * Convert JSON array to a SheetJS worksheet with auto-fit column widths
 * and comfortable row padding.
 */
export function createStyledWorksheet(
  data: any[],
  minColWidth = 14,
  maxColWidth = 65,
  padding = 4
): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data);
  return applyWorksheetSpacing(ws, minColWidth, maxColWidth, padding);
}

/**
 * Export JSON array as a styled native .xlsx workbook with proper column widths.
 */
export function exportAsExcel(
  data: any[],
  filename: string,
  sheetName = 'Report',
  minColWidth = 14,
  maxColWidth = 65,
  padding = 4
): void {
  const cleanName = sanitizeSheetName(sheetName);
  const ws = createStyledWorksheet(data, minColWidth, maxColWidth, padding);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, cleanName);

  const safeFilename = filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename.replace(/\.[^/.]+$/, '')}.xlsx`;

  XLSX.writeFile(wb, safeFilename);
}

/**
 * Export multi-section reports (e.g., Analytics, Demographics, Outcomes)
 * into a single native .xlsx workbook where each section is an auto-spaced tab.
 */
export function exportSectionsToExcel(
  sections: { title: string; headers?: string[]; rows: any[] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  const existingSheetNames = new Set<string>();

  for (const section of sections) {
    if (!section.rows || section.rows.length === 0) continue;

    const sheetTitle = sanitizeSheetName(section.title, existingSheetNames);
    const ws = createStyledWorksheet(section.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  }

  // If no sections had rows, write an empty sheet placeholder
  if (wb.SheetNames.length === 0) {
    const ws = createStyledWorksheet([{ Status: 'No data records found' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
  }

  const safeFilename = filename.toLowerCase().endsWith('.xlsx')
    ? filename
    : `${filename.replace(/\.[^/.]+$/, '')}.xlsx`;

  XLSX.writeFile(wb, safeFilename);
}
