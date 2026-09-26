import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  ClockIcon,
  ScaleIcon,
  ArrowPathIcon,
  EyeIcon,
  TableCellsIcon,
  PrinterIcon,
  FunnelIcon,
  XMarkIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ChartPieIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// Helper to trigger browser download of a Blob
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Format date nicely
function formatDate(dateStr?: string) {
  if (!dateStr) return '---';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ReportsPage() {
  const addNotification = useUIStore((s) => s.addNotification);
  const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');

  // Live Summary Stats
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Global filters for live reports
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Loading indicator for active export
  const [generating, setGenerating] = useState<string | null>(null);

  // Pre-Export Confidentiality Modal state
  const [pendingExport, setPendingExport] = useState<{
    execute: () => Promise<void>;
    filename: string;
    format: string;
    reportTitle: string;
  } | null>(null);

  // Live Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    subtitle: string;
    data: any[];
    reportId: string;
  } | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Export Audit History
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFormatFilter, setHistoryFormatFilter] = useState('');

  // Surveys list for survey response report selector
  const [surveysList, setSurveysList] = useState<any[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');

  // Load summary stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await adminApi.reportStats();
      setStats(data);
    } catch {
      // Fallback
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Load export audit history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await adminApi.exportHistory();
      setHistory(data || []);
    } catch {
      addNotification('Failed to load export history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [addNotification]);

  // Load available surveys
  const loadSurveys = useCallback(async () => {
    try {
      const res = await adminApi.reportSurveys({ format: 'json' });
      const list = res.data || res || [];
      setSurveysList(list);
      if (list.length > 0 && !selectedSurveyId) {
        setSelectedSurveyId(list[0]['Survey ID'] || list[0].id);
      }
    } catch {
      // ignore
    }
  }, [selectedSurveyId]);

  useEffect(() => {
    loadStats();
    loadSurveys();
  }, [loadStats, loadSurveys]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Active query parameters object
  const activeParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (selectedCourse) params.program = selectedCourse;
    if (selectedBatch) params.batch = selectedBatch;
    if (selectedStatus) params.employment_status = selectedStatus;
    return params;
  }, [selectedCourse, selectedBatch, selectedStatus]);

  const hasActiveFilters = Boolean(selectedCourse || selectedBatch || selectedStatus);

  const resetFilters = () => {
    setSelectedCourse('');
    setSelectedBatch('');
    setSelectedStatus('');
  };

  // ---------------------------------------------------------------------------
  // Export Handlers
  // ---------------------------------------------------------------------------

  // Helper: Export as XLSX via SheetJS
  const exportAsExcel = (data: any[], filename: string, sheetName = 'Report') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, filename);
  };

  // Helper: Printable HTML / PDF Window
  const openPrintWindow = (title: string, data: any[]) => {
    if (data.length === 0) {
      alert('No records available to print for this report.');
      return;
    }
    const headers = Object.keys(data[0]);
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - CTU-Naga Alumni Connect</title>
  <style>
    @media print {
      @page { size: landscape; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; padding: 24px; font-size: 11px; }
    .header { border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 18px; font-weight: bold; color: #111827; margin: 0 0 4px 0; }
    .sub { font-size: 11px; color: #6b7280; margin: 0; }
    .dpa-stamp { background: #fdf4ff; border: 1px solid #d8b4fe; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 10px; color: #581c87; }
    .dpa-stamp strong { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; color: #374151; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Cebu Technological University — Naga Campus</h1>
      <p class="sub">CTU-Naga Alumni Connect · Institutional Analytics &amp; Graduate Tracer System</p>
      <p class="sub" style="margin-top: 4px; font-weight: 600; color: #ea580c;">${title}</p>
    </div>
    <div style="text-align: right;">
      <p class="sub"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      <p class="sub"><strong>Total Records:</strong> ${data.length}</p>
    </div>
  </div>

  <div class="dpa-stamp">
    <strong>CONFIDENTIALITY &amp; DATA PRIVACY NOTICE (RULE 5 &amp; REPUBLIC ACT NO. 10173):</strong><br>
    This report contains sensitive institutional and personal alumni information. Unauthorized copying, distribution, or external disclosure is strictly prohibited. Exported for authorized university administrative purposes only.
  </div>

  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data
        .map(
          (row) =>
            `<tr>${headers
              .map((h) => `<td>${row[h] !== null && row[h] !== undefined ? String(row[h]) : ''}</td>`)
              .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>CTU-Naga Alumni Connect — Confidential Institutional Record</span>
    <span>Page 1 of 1</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to view and print the report.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  // Queue an export through the DPA acknowledgment modal
  const requestExport = (
    reportTitle: string,
    filename: string,
    format: 'csv' | 'xlsx' | 'json' | 'pdf',
    fetcher: () => Promise<void>
  ) => {
    setPendingExport({
      reportTitle,
      filename,
      format,
      execute: fetcher,
    });
  };

  const handleConfirmExport = async () => {
    if (!pendingExport) return;
    const { execute, filename } = pendingExport;
    setPendingExport(null);
    setGenerating(filename);
    try {
      await execute();
      addNotification(`Report exported successfully: ${filename}`, 'success');
      loadStats();
      if (activeTab === 'history') loadHistory();
    } catch (err: any) {
      addNotification(err.message || 'Failed to export report.', 'error');
    } finally {
      setGenerating(null);
    }
  };

  // Open Live Preview Modal
  const openPreview = async (reportId: string, title: string, subtitle: string, fetchFn: () => Promise<any>) => {
    setPreviewLoading(true);
    setPreviewSearch('');
    try {
      const res = await fetchFn();
      const rows = Array.isArray(res) ? res : res.data || [];
      setPreviewModal({
        reportId,
        title,
        subtitle,
        data: rows,
      });
    } catch (err: any) {
      addNotification(err.message || 'Failed to load preview data', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Master Institutional Export (All-in-One Multi-Sheet Workbook)
  // ---------------------------------------------------------------------------
  const handleExportMasterWorkbook = async () => {
    setGenerating('master-workbook');
    try {
      addNotification('Compiling Master Institutional Workbook across all live datasets...', 'info');

      const [alumniRes, empRes, compRes, salaryRes, courseRes, batchRes, skillsRes, tracerRes] =
        await Promise.all([
          adminApi.reportAlumni({ ...activeParams, format: 'json' }),
          adminApi.reportEmployment({ ...activeParams, format: 'json' }),
          adminApi.reportEmployer({ format: 'json' }),
          adminApi.reportSalaryDistribution({ format: 'json' }),
          adminApi.reportEmploymentByCourse({ ...activeParams, format: 'json' }),
          adminApi.reportBatchEmployment({ format: 'json' }),
          adminApi.reportSkills({ format: 'json' }),
          adminApi.reportSurveys({ format: 'json' }),
        ]);

      const wb = XLSX.utils.book_new();

      // Sheet 1: Institutional Cover
      const coverData = [
        { Parameter: 'Institution', Value: 'Cebu Technological University - Naga Campus' },
        { Parameter: 'System', Value: 'CTU-Naga Alumni Connect — Centralized Graduate Tracer' },
        { Parameter: 'Compliance', Value: 'Republic Act No. 10173 (Data Privacy Act of 2012)' },
        { Parameter: 'Generated Date', Value: new Date().toLocaleString() },
        { Parameter: 'Degree Filter', Value: selectedCourse || 'All Programs' },
        { Parameter: 'Batch Filter', Value: selectedBatch || 'All Batches' },
        { Parameter: 'Total Alumni Tracked', Value: stats?.totalAlumni || 0 },
        { Parameter: 'Total Employed Tracked', Value: stats?.totalEmployed || 0 },
        { Parameter: 'Registered Partner Companies', Value: stats?.totalCompanies || 0 },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coverData), 'Institutional Overview');

      // Sheet 2: Alumni Registry
      const alumniRows = alumniRes.data || [];
      if (alumniRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alumniRows), 'Alumni Registry');
      }

      // Sheet 3: Employment Records
      const empRows = empRes.data || [];
      if (empRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), 'Graduate Employment');
      }

      // Sheet 4: Companies & Industry Partners
      const compRows = compRes.data || [];
      if (compRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compRows), 'Partner Companies');
      }

      // Sheet 5: Salary Analytics
      const salaryRows = salaryRes.data || [];
      if (salaryRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salaryRows), 'Salary Brackets');
      }

      // Sheet 6: Employment by Program
      const courseRows = courseRes.data || [];
      if (courseRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(courseRows), 'Program Employment Rates');
      }

      // Sheet 7: Batch Trends
      const batchRows = batchRes.data || [];
      if (batchRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(batchRows), 'Batch Absorption Rates');
      }

      // Sheet 8: Skills Inventory
      const skillsRows = skillsRes.data || [];
      if (skillsRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skillsRows), 'Skills Inventory');
      }

      // Sheet 9: Tracer Surveys Summary
      const tracerRows = tracerRes.data || [];
      if (tracerRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tracerRows), 'Tracer Surveys');
      }

      const fileName = `CTU_Master_Institutional_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      addNotification(`Master Institutional Workbook downloaded: ${fileName}`, 'success');
      loadStats();
    } catch (err: any) {
      addNotification(err.message || 'Failed to generate master workbook', 'error');
    } finally {
      setGenerating(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Report Card Definitions
  // ---------------------------------------------------------------------------
  const reportCards = [
    {
      id: 'alumni',
      title: 'Alumni Master Registry',
      badge: `${stats?.totalAlumni || 0} Registered`,
      desc: 'Comprehensive directory of graduates with contact details, degree programs, graduation years, verification status, and current employment.',
      icon: AcademicCapIcon,
      accent: 'orange',
      fetchLiveJson: () => adminApi.reportAlumni({ ...activeParams, format: 'json' }),
      fetchCsv: () => adminApi.reportAlumni({ ...activeParams, format: 'csv' }),
      defaultFilename: 'alumni-master-list',
    },
    {
      id: 'employment',
      title: 'Graduate Employment Tracker',
      badge: `${stats?.totalEmployed || 0} Employed Records`,
      desc: 'Granular employment histories, employer names, job titles, industries, full-time/part-time modalities, and compensation ranges.',
      icon: BriefcaseIcon,
      accent: 'emerald',
      fetchLiveJson: () => adminApi.reportEmployment({ ...activeParams, format: 'json' }),
      fetchCsv: () => adminApi.reportEmployment({ ...activeParams, format: 'csv' }),
      defaultFilename: 'graduate-employment-report',
    },
    {
      id: 'career-progress',
      title: 'Career Progression & Trajectory',
      badge: 'Progression Paths',
      desc: 'Multi-role career trajectories showing alumni job progressions, promotions, employer transitions, and tenure milestones over time.',
      icon: ChartPieIcon,
      accent: 'blue',
      fetchLiveJson: () => adminApi.reportCareerProgress({ format: 'json' }),
      fetchCsv: () => adminApi.reportCareerProgress({ format: 'csv' }),
      defaultFilename: 'career-progression-report',
    },
    {
      id: 'salary',
      title: 'Salary & Compensation Analytics',
      badge: 'Compensation Brackets',
      desc: 'Distribution of reported salaries across Philippine Peso brackets, highest and lowest ranges, and cross-industry wage medians.',
      icon: BanknotesIcon,
      accent: 'amber',
      fetchLiveJson: () => adminApi.reportSalaryDistribution({ format: 'json' }),
      fetchCsv: () => adminApi.reportSalaryDistribution({ format: 'csv' }),
      defaultFilename: 'salary-distribution-report',
    },
    {
      id: 'employment-by-course',
      title: 'Employment Rate by Academic Program',
      badge: 'Course Breakdown',
      desc: 'Comparative employment outcomes by degree program (BSIT, BIT, BEEd, BSEd, BTLED) evaluating institutional absorption and market demand.',
      icon: AcademicCapIcon,
      accent: 'indigo',
      fetchLiveJson: () => adminApi.reportEmploymentByCourse({ ...activeParams, format: 'json' }),
      fetchCsv: () => adminApi.reportEmploymentByCourse({ ...activeParams, format: 'csv' }),
      defaultFilename: 'employment-rate-by-course',
    },
    {
      id: 'batch-employment',
      title: 'Graduation Batch Employment Trends',
      badge: 'Yearly Cohorts',
      desc: 'Year-by-year employment outcomes across graduation batches tracking time-to-employment and historical cohort absorption rates.',
      icon: ClockIcon,
      accent: 'teal',
      fetchLiveJson: () => adminApi.reportBatchEmployment({ format: 'json' }),
      fetchCsv: () => adminApi.reportBatchEmployment({ format: 'csv' }),
      defaultFilename: 'batch-employment-trends',
    },
    {
      id: 'degree-alignment',
      title: 'Degree Alignment & Tracer Compliance',
      badge: 'Curriculum Relevance',
      desc: 'Calculates the degree-to-job relevance rate by matching graduate roles and industries against academic program competencies (CHED GTS metric).',
      icon: SparklesIcon,
      accent: 'purple',
      fetchLiveJson: () => adminApi.reportDegreeAlignment({ format: 'json' }),
      fetchCsv: () => adminApi.reportDegreeAlignment({ format: 'csv' }),
      defaultFilename: 'degree-alignment-tracer-study',
    },
    {
      id: 'employer',
      title: 'Employer & Industry Partner Directory',
      badge: `${stats?.totalCompanies || 0} Companies`,
      desc: 'Full directory of partner employers, registered companies, verification status, contact persons, locations, and active job postings count.',
      icon: BuildingOfficeIcon,
      accent: 'rose',
      fetchLiveJson: () => adminApi.reportEmployer({ format: 'json' }),
      fetchCsv: () => adminApi.reportEmployer({ format: 'csv' }),
      defaultFilename: 'employer-partner-directory',
    },
    {
      id: 'surveys',
      title: 'Graduate Tracer Study (GTS) Summary',
      badge: `${stats?.totalSurveys || 0} Tracer Cycles`,
      desc: 'Summary of institutional tracer studies, target alumni groups, active cycles, response tallies, and cohort completion percentages.',
      icon: ClipboardDocumentCheckIcon,
      accent: 'sky',
      fetchLiveJson: () => adminApi.reportSurveys({ format: 'json' }),
      fetchCsv: () => adminApi.reportSurveys({ format: 'csv' }),
      defaultFilename: 'tracer-surveys-summary',
    },
    {
      id: 'survey-responses',
      title: 'Tracer Survey Response Datasets',
      badge: `${stats?.totalSurveyResponses || 0} Responses`,
      desc: 'Individual questionnaire responses from graduates with itemized answer fields for accreditation reviews, SUC leveling, and tracer research.',
      icon: DocumentTextIcon,
      accent: 'violet',
      hasSurveyPicker: true,
      fetchLiveJson: () =>
        selectedSurveyId
          ? adminApi.reportSurvey(selectedSurveyId, { format: 'json' })
          : Promise.reject(new Error('Please select a survey cycle.')),
      fetchCsv: () =>
        selectedSurveyId
          ? adminApi.reportSurvey(selectedSurveyId, { format: 'csv' })
          : Promise.reject(new Error('Please select a survey cycle.')),
      defaultFilename: 'survey-itemized-responses',
    },
    {
      id: 'skills',
      title: 'Graduate Skills & Competency Inventory',
      badge: `${stats?.totalUniqueSkills || 0} Competencies`,
      desc: 'Catalog of technical and soft skills reported by alumni, average self-reported proficiency scores, and verified competency certifications.',
      icon: SparklesIcon,
      accent: 'amber',
      fetchLiveJson: () => adminApi.reportSkills({ format: 'json' }),
      fetchCsv: () => adminApi.reportSkills({ format: 'csv' }),
      defaultFilename: 'graduate-skills-inventory',
    },
    {
      id: 'jobs',
      title: 'Job Market & Vacancies Report',
      badge: `${stats?.totalJobPostings || 0} Postings`,
      desc: 'Institutional job board records, vacancy positions, hiring companies, applicant counts, accepted hires, and salary expectations.',
      icon: BriefcaseIcon,
      accent: 'cyan',
      fetchLiveJson: () => adminApi.reportJobs({ format: 'json' }),
      fetchCsv: () => adminApi.reportJobs({ format: 'csv' }),
      defaultFilename: 'job-market-vacancies-report',
    },
    {
      id: 'system-master',
      title: 'Full Institutional Master Archive',
      badge: 'Multi-Entity Bundle',
      desc: 'All-inclusive multi-table archive containing alumni records, employment histories, partner companies, surveys, and system audit logs.',
      icon: ShieldCheckIcon,
      accent: 'slate',
      fetchLiveJson: () => adminApi.reportSystemMaster({ format: 'json' }),
      fetchCsv: () => adminApi.reportSystemMaster({ format: 'csv' }),
      defaultFilename: 'system-master-institutional-backup',
    },
  ];

  // Filtered Preview Data
  const previewRows = useMemo(() => {
    if (!previewModal?.data) return [];
    if (!previewSearch.trim()) return previewModal.data;
    const term = previewSearch.toLowerCase();
    return previewModal.data.filter((row: any) =>
      Object.values(row).some((val) => String(val || '').toLowerCase().includes(term))
    );
  }, [previewModal, previewSearch]);

  // Filtered History Data
  const filteredHistory = useMemo(() => {
    return history.filter((item: any) => {
      const matchesSearch =
        !historySearch ||
        (item.report_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (item.admin_email || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (item.ip_address || '').includes(historySearch);
      const matchesFormat = !historyFormatFilter || item.format?.toLowerCase() === historyFormatFilter.toLowerCase();
      return matchesSearch && matchesFormat;
    });
  }, [history, historySearch, historyFormatFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6 text-orange-600" />
            Reports &amp; Analytics Export
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Institutional career analytics, graduate tracer compliance reports, and live Data Privacy Act (RA 10173) audited data downloads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Master All-in-One Export Button */}
          <button
            onClick={handleExportMasterWorkbook}
            disabled={generating === 'master-workbook'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl shadow-xs hover:shadow-md hover:from-orange-700 hover:to-amber-700 transition-all cursor-pointer disabled:opacity-50"
            title="Download all institutional reports bundled into a single multi-tab Excel file"
          >
            <TableCellsIcon className="w-4 h-4" />
            {generating === 'master-workbook' ? 'Compiling Workbook...' : 'Master Excel (All Datasets)'}
          </button>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'reports' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Reports ({reportCards.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClockIcon className="w-3.5 h-3.5" />
              Export Audit Trail ({stats?.totalExportsLogged ?? history.length})
            </button>
          </div>
        </div>
      </div>

      {/* Live Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Alumni Registered</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {loadingStats ? '...' : (stats?.totalAlumni || 0).toLocaleString()}
          </p>
          <span className="inline-block mt-1 text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">
            Live Database
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Employed Graduates</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {loadingStats ? '...' : (stats?.totalEmployed || 0).toLocaleString()}
          </p>
          <span className="inline-block mt-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
            Active Records
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Partner Employers</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {loadingStats ? '...' : (stats?.totalCompanies || 0).toLocaleString()}
          </p>
          <span className="inline-block mt-1 text-[10px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
            Verified Companies
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Tracer Surveys</p>
          <p className="text-xl font-bold text-purple-600 mt-1">
            {loadingStats ? '...' : (stats?.totalSurveys || 0).toLocaleString()}
          </p>
          <span className="inline-block mt-1 text-[10px] text-purple-700 font-medium bg-purple-50 px-1.5 py-0.5 rounded">
            {stats?.totalSurveyResponses || 0} Submissions
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Active Job Posts</p>
          <p className="text-xl font-bold text-cyan-600 mt-1">
            {loadingStats ? '...' : (stats?.totalJobPostings || 0).toLocaleString()}
          </p>
          <span className="inline-block mt-1 text-[10px] text-cyan-700 font-medium bg-cyan-50 px-1.5 py-0.5 rounded">
            Market Demand
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Audit Logged Exports</p>
          <p className="text-xl font-bold text-gray-700 mt-1">
            {loadingStats ? '...' : (stats?.totalExportsLogged || 0).toLocaleString()}
          </p>
          <span className="inline-block mt-1 text-[10px] text-gray-600 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
            RA 10173 Compliant
          </span>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40 p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 text-purple-700 mt-0.5">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
              Proper Use of Reports and Analytics (RA 10173 Compliance — Rule 5)
            </h4>
            <p className="text-xs text-purple-900/80 mt-1 leading-relaxed">
              Career analytics and reports must only be accessed by authorized university personnel. All downloaded files contain confidentiality watermarks, are digitally stamped with your administrative identity, and are permanently recorded in the immutable audit ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Tab 1: Available Live Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Institutional Filter Toolbar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-800">Filter Live Data:</span>
                {hasActiveFilters && (
                  <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    Active Filters Applied
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Degree Program Filter */}
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="">All Degree Programs</option>
                  <option value="BSIT">BS Information Technology (BSIT)</option>
                  <option value="BIT">BS Industrial Technology (BIT)</option>
                  <option value="BEEd">Bachelor of Elementary Education (BEEd)</option>
                  <option value="BSEd-Math">BSEd - Mathematics</option>
                  <option value="BTLED-HE">BTLED - Home Economics</option>
                  <option value="BTLED-ICT">BTLED - Information &amp; Comms</option>
                </select>

                {/* Graduation Batch Year Filter */}
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="">All Graduation Batches</option>
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014].map((year) => (
                    <option key={year} value={year}>
                      Batch {year}
                    </option>
                  ))}
                </select>

                {/* Employment Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="">All Employment Statuses</option>
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed / Entrepreneur</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="seeking">Seeking Opportunities</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-red-600 hover:text-red-700 px-2 py-1 font-medium underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Report Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportCards.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all duration-150 relative group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {report.badge}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{report.desc}</p>

                    {/* Specific Survey Picker if applicable */}
                    {report.hasSurveyPicker && (
                      <div className="mt-2.5 bg-violet-50/60 p-2 rounded-lg border border-violet-100">
                        <label className="block text-[10px] font-semibold text-violet-900 mb-1">
                          Select Survey Cycle:
                        </label>
                        <select
                          value={selectedSurveyId}
                          onChange={(e) => setSelectedSurveyId(e.target.value)}
                          className="w-full text-xs border border-violet-200 rounded px-2 py-1 bg-white text-gray-800 outline-none"
                        >
                          {surveysList.map((s) => (
                            <option key={s['Survey ID'] || s.id} value={s['Survey ID'] || s.id}>
                              {s['Survey Title'] || s.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-1.5">
                    {/* Preview Button */}
                    <button
                      onClick={() =>
                        openPreview(report.id, report.title, report.desc, async () => {
                          const res = await report.fetchLiveJson();
                          return res.data || res;
                        })
                      }
                      disabled={previewLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                      title="Inspect live database records in a preview table"
                    >
                      <EyeIcon className="w-3.5 h-3.5 text-gray-500" />
                      Preview
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Export CSV */}
                      <button
                        onClick={() =>
                          requestExport(
                            report.title,
                            `${report.defaultFilename}.csv`,
                            'csv',
                            async () => {
                              const blob = await report.fetchCsv();
                              downloadBlob(blob, `${report.defaultFilename}.csv`);
                            }
                          )
                        }
                        disabled={generating !== null}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Export as RFC 4180 CSV with RA 10173 DPA notice"
                      >
                        <ArrowDownTrayIcon className="w-3 h-3" />
                        CSV
                      </button>

                      {/* Export Excel (.xlsx) */}
                      <button
                        onClick={() =>
                          requestExport(
                            report.title,
                            `${report.defaultFilename}.xlsx`,
                            'xlsx',
                            async () => {
                              const res = await report.fetchLiveJson();
                              const rows = res.data || (Array.isArray(res) ? res : []);
                              exportAsExcel(rows, `${report.defaultFilename}.xlsx`, report.title);
                            }
                          )
                        }
                        disabled={generating !== null}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Export as native Microsoft Excel (.xlsx) spreadsheet"
                      >
                        <TableCellsIcon className="w-3 h-3" />
                        Excel
                      </button>

                      {/* Export JSON */}
                      <button
                        onClick={() =>
                          requestExport(
                            report.title,
                            `${report.defaultFilename}.json`,
                            'json',
                            async () => {
                              const res = await report.fetchLiveJson();
                              const jsonStr = JSON.stringify(res.data || res, null, 2);
                              const blob = new Blob([jsonStr], { type: 'application/json' });
                              downloadBlob(blob, `${report.defaultFilename}.json`);
                            }
                          )
                        }
                        disabled={generating !== null}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                        title="Export structured JSON dataset"
                      >
                        JSON
                      </button>

                      {/* Print / PDF Report */}
                      <button
                        onClick={async () => {
                          try {
                            const res = await report.fetchLiveJson();
                            const rows = res.data || (Array.isArray(res) ? res : []);
                            openPrintWindow(report.title, rows);
                          } catch (err: any) {
                            addNotification(err.message || 'Print generation failed', 'error');
                          }
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Open official printable summary (PDF print)"
                      >
                        <PrinterIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Export Audit Trail (Rule 5 & RA 10173) */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
                Immutable Export Audit Trail
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Every downloaded institutional report is logged with the administrator's identity, IP address, and record count under RA 10173.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search report, admin..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 w-48"
                />
              </div>

              <select
                value={historyFormatFilter}
                onChange={(e) => setHistoryFormatFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 outline-none"
              >
                <option value="">All Formats</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="json">JSON</option>
                <option value="pdf">PDF</option>
              </select>

              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-orange-500' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Report Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Records</th>
                  <th className="py-3 px-4">Exported By</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Exported At</th>
                  <th className="py-3 px-4">DPA Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      {loadingHistory ? 'Loading audit trail records...' : 'No matching report exports found.'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900">{item.report_name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">{item.report_type}</td>
                      <td className="py-3 px-4">
                        <span className="uppercase font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                          {item.format}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-900">
                        {item.record_count?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {item.admin_email || 'Administrator'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                        {item.ip_address || 'unknown'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(item.exported_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <ShieldCheckIcon className="w-3 h-3 text-emerald-600" />
                          Compliant
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Live Data Preview Modal */}
      {/* --------------------------------------------------------------------- */}
      {previewModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 via-white to-amber-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <TableCellsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {previewModal.title} — Live Preview
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Viewing {previewRows.length} of {previewModal.data.length} live records from database.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportAsExcel(previewModal.data, `${previewModal.reportId}-preview.xlsx`, previewModal.title)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <TableCellsIcon className="w-3.5 h-3.5" />
                  Export Excel
                </button>
                <button
                  onClick={() => openPrintWindow(previewModal.title, previewModal.data)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer ml-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="px-6 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between shrink-0">
              <div className="relative w-72">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search in preview records..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                />
              </div>
              <span className="text-xs text-gray-500">
                {previewRows.length === 0 ? 'No matches' : `${previewRows.length} matching rows`}
              </span>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-6">
              {previewRows.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-xs">
                  No records match your search criteria.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 text-gray-700 font-semibold uppercase text-[10px]">
                    <tr>
                      {Object.keys(previewRows[0]).map((h) => (
                        <th key={h} className="py-2.5 px-3 border-r border-gray-200 last:border-r-0 whitespace-nowrap bg-gray-50">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        {Object.keys(previewRows[0]).map((h) => (
                          <td key={h} className="py-2 px-3 border-r border-gray-100 last:border-r-0 text-gray-700 whitespace-nowrap">
                            {row[h] !== null && row[h] !== undefined ? String(row[h]) : '---'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {previewRows.length > 100 && (
                <p className="text-[11px] text-gray-400 text-center mt-3">
                  Showing first 100 records for preview. Full dataset will be exported.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Pre-Export Confidentiality Acknowledgement Modal (Rule 5 & RA 10173) */}
      {/* --------------------------------------------------------------------- */}
      {pendingExport && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-purple-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <ScaleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Confidentiality Acknowledgment
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              You are downloading <strong>{pendingExport.reportTitle}</strong> (format:{' '}
              <span className="uppercase font-semibold text-purple-700">{pendingExport.format}</span>) containing protected institutional data.
            </p>

            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 mb-4 text-xs text-purple-950 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-purple-700 shrink-0" />
                Data Privacy Act of 2012 (RA 10173) Compliance:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-900/85">
                <li>This report must only be used for authorized CTU administrative analytics.</li>
                <li>Personal information must not be transmitted, copied, or shared externally.</li>
                <li>This download is permanently logged with your user credentials and timestamp.</li>
              </ul>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setPendingExport(null)}
                className="flex-1 px-4 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                I Acknowledge &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
