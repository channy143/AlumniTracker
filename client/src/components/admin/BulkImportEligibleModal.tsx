import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { adminApi } from '@/services/api';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface BulkImportEligibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCandidate {
  student_id: string | null;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  program: string | null;
  year_graduated: number | null;
  graduation_date: string | null;
  birth_date: string | null;
  isValid: boolean;
  validationError?: string;
}

function normalizeDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      const year = parts[2];
      const mOrD1 = parseInt(parts[0], 10);
      const mOrD2 = parseInt(parts[1], 10);
      if (mOrD1 <= 12) {
        return `${year}-${String(mOrD1).padStart(2, '0')}-${String(mOrD2).padStart(2, '0')}`;
      } else if (mOrD2 <= 12) {
        return `${year}-${String(mOrD2).padStart(2, '0')}-${String(mOrD1).padStart(2, '0')}`;
      }
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

export default function BulkImportEligibleModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportEligibleModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCandidate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    inserted: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const headers = [
      'Student ID',
      'Last Name',
      'First Name',
      'Middle Name',
      'Program',
      'Year Graduated',
      'Graduation Date',
      'Birth Date',
    ];
    const sampleRows = [
      ['CTU-2024-001', 'Dela Cruz', 'Juan', 'Santos', 'BSIT', 2024, '2024-06-15', '2002-05-10'],
      ['CTU-2024-002', 'Garcia', 'Maria', 'Reyes', 'BSEd-Math', 2024, '2024-06-15', '2002-08-22'],
      ['', 'Alcantara', 'Mark', 'Bautista', 'BTLED', 2024, '2024-06-15', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Eligible_Alumni');
    XLSX.writeFile(wb, 'ctu_naga_eligible_alumni_template.xlsx');
  };

  const handleFileProcess = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setImportSummary(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawJson.length) {
        setParseError('The uploaded file contains no data rows.');
        setParsedRows([]);
        return;
      }

      // Column name matcher
      const findField = (row: Record<string, any>, patterns: string[]) => {
        for (const key of Object.keys(row)) {
          const cleanKey = key.trim().toLowerCase().replace(/[_\-\s]+/g, '');
          for (const p of patterns) {
            const cleanPattern = p.toLowerCase().replace(/[_\-\s]+/g, '');
            if (cleanKey === cleanPattern || cleanKey.includes(cleanPattern)) {
              return row[key];
            }
          }
        }
        return '';
      };

      const normalized: ParsedCandidate[] = rawJson.map((row) => {
        const studentIdRaw = findField(row, ['studentid', 'idnumber', 'studentno', 'id', 'idnum']);
        const lastNameRaw = findField(row, ['lastname', 'surname', 'familyname']);
        const firstNameRaw = findField(row, ['firstname', 'givenname', 'first']);
        const middleNameRaw = findField(row, ['middlename', 'middleinitial', 'mi']);
        const programRaw = findField(row, ['program', 'course', 'degree', 'major', 'curr']);
        const yearGradRaw = findField(row, ['yeargraduated', 'batch', 'gradyear', 'year']);
        const gradDateRaw = findField(row, ['graduationdate', 'commencementdate', 'dategraduated']);
        const birthDateRaw = findField(row, ['birthdate', 'dateofbirth', 'dob', 'birthday']);

        const student_id = studentIdRaw ? String(studentIdRaw).trim() : null;
        const last_name = String(lastNameRaw).trim();
        const first_name = String(firstNameRaw).trim();
        const middle_name = middleNameRaw ? String(middleNameRaw).trim() : null;
        const program = programRaw ? String(programRaw).trim() : null;
        const year_graduated = yearGradRaw ? parseInt(String(yearGradRaw), 10) || null : null;
        const graduation_date = normalizeDate(gradDateRaw);
        const birth_date = normalizeDate(birthDateRaw);

        const isValid = Boolean(first_name && last_name);
        const validationError = !isValid
          ? 'Missing required name (First and Last Name required)'
          : undefined;

        return {
          student_id,
          first_name,
          last_name,
          middle_name,
          program,
          year_graduated,
          graduation_date,
          birth_date,
          isValid,
          validationError,
        };
      });

      setParsedRows(normalized);
    } catch (err: any) {
      setParseError(`Failed to read file: ${err?.message || 'Invalid spreadsheet structure'}`);
      setParsedRows([]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (!validRows.length) return;

    setUploading(true);
    setProgress(10);

    const BATCH_SIZE = 150;
    let totalInserted = 0;
    let totalSkipped = parsedRows.length - validRows.length;
    const accumulatedErrors: string[] = [];

    try {
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        const res = await adminApi.eligibleAlumniBulkImport(batch);

        if (res) {
          totalInserted += res.inserted || batch.length;
          totalSkipped += res.skipped || 0;
          if (res.errors && Array.isArray(res.errors)) {
            accumulatedErrors.push(...res.errors);
          }
        }

        const currentProgress = Math.min(90, Math.round(((i + batch.length) / validRows.length) * 100));
        setProgress(currentProgress);
      }

      setProgress(100);
      setImportSummary({
        total: parsedRows.length,
        inserted: totalInserted,
        skipped: totalSkipped,
        errors: accumulatedErrors,
      });

      onSuccess();
    } catch (err: any) {
      setParseError(err?.message || 'Server error occurred during batch upload.');
    } finally {
      setUploading(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <ArrowUpTrayIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Bulk Import Eligible Alumni Registry</h2>
              <p className="text-xs text-gray-500">
                Upload CSV or Excel files from Registrar to pre-populate verified graduates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Download Template Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-2.5">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Need the standardized Registrar format?</p>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  Download our ready-to-use template with correct headers (Student ID, Name, Program, Batch, Date).
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shrink-0 shadow-2xs"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Download Template (.xlsx)
            </button>
          </div>

          {/* Import Summary Results Screen */}
          {importSummary ? (
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-950">Bulk Import Completed Successfully!</h3>
                <p className="text-xs text-green-800 mt-1">
                  The eligible alumni registry has been populated and verified.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center pt-2">
                <div className="bg-white p-2.5 rounded-lg border border-green-200 shadow-2xs">
                  <p className="text-[11px] text-gray-500 font-medium">Total Rows</p>
                  <p className="text-base font-bold text-gray-900">{importSummary.total}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-green-200 shadow-2xs">
                  <p className="text-[11px] text-green-600 font-medium">Imported / Updated</p>
                  <p className="text-base font-bold text-green-600">{importSummary.inserted}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-green-200 shadow-2xs">
                  <p className="text-[11px] text-amber-600 font-medium">Skipped</p>
                  <p className="text-base font-bold text-amber-600">{importSummary.skipped}</p>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="text-left bg-white p-3 rounded-lg border border-amber-200 text-[11px] text-amber-800 max-h-32 overflow-y-auto">
                  <p className="font-semibold mb-1">Notes during import:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {importSummary.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50/50'
                    : file
                    ? 'border-green-400 bg-green-50/20'
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/10'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100/70 text-orange-600 flex items-center justify-center">
                    <ArrowUpTrayIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {file ? file.name : 'Click to upload or drag and drop spreadsheet'}
                    </p>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Supports Excel files (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </p>
                  </div>
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Stats & Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{parsedRows.length} total rows detected</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold text-[10px]">
                        {validCount} ready to import
                      </span>
                      {invalidCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold text-[10px]">
                          {invalidCount} missing required names
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[11px]">Showing preview of first 50 entries</span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-64 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px] uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Status</th>
                          <th className="py-2 px-3 font-semibold">Student ID</th>
                          <th className="py-2 px-3 font-semibold">Full Name</th>
                          <th className="py-2 px-3 font-semibold">Program</th>
                          <th className="py-2 px-3 font-semibold">Batch</th>
                          <th className="py-2 px-3 font-semibold">Graduation Date</th>
                          <th className="py-2 px-3 font-semibold">Birth Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 50).map((r, idx) => (
                          <tr key={idx} className={r.isValid ? 'hover:bg-gray-50/60' : 'bg-red-50/30'}>
                            <td className="py-1.5 px-3 whitespace-nowrap">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-[10px]">
                                  <CheckCircleIcon className="w-3.5 h-3.5" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-[10px]" title={r.validationError}>
                                  <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Incomplete
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-gray-700">{r.student_id || '—'}</td>
                            <td className="py-1.5 px-3 font-semibold text-gray-900">
                              {r.last_name}, {r.first_name} {r.middle_name || ''}
                            </td>
                            <td className="py-1.5 px-3 text-gray-600">{r.program || '—'}</td>
                            <td className="py-1.5 px-3 text-gray-600">{r.year_graduated || '—'}</td>
                            <td className="py-1.5 px-3 text-gray-500">{r.graduation_date || '—'}</td>
                            <td className="py-1.5 px-3 text-gray-500">{r.birth_date || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {uploading && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                        <span>Importing records to database...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!importSummary && (
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={uploading || validCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4" />
              {uploading ? 'Processing Batch...' : `Import ${validCount} Eligible Alumni`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
