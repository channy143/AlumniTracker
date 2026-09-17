import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  ClockIcon,
  ScaleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const dpaHeader =
    '# -----------------------------------------------------------------------------\n' +
    '# CONFIDENTIALITY & DATA PRIVACY NOTICE (RULE 5 & REPUBLIC ACT NO. 10173)\n' +
    '# CTU-Naga Alumni Connect — Exported Institutional Analytics\n' +
    '# Unauthorized distribution, copying, or disclosure is strictly prohibited.\n' +
    '# -----------------------------------------------------------------------------\n';
  return dpaHeader + [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export default function ReportsPage() {
  const addNotification = useUIStore((s) => s.addNotification);
  const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');
  const [generating, setGenerating] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState<{
    fetcher: () => Promise<Blob>;
    filename: string;
    reportId: string;
    title: string;
  } | null>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await adminApi.exportHistory();
      setHistory(data || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const triggerExport = (fetcher: () => Promise<Blob>, filename: string, reportId: string, title: string) => {
    setPendingExport({ fetcher, filename, reportId, title });
  };

  const confirmAndDownload = async () => {
    if (!pendingExport) return;
    const { fetcher, filename, reportId } = pendingExport;
    setPendingExport(null);
    setGenerating(reportId);
    try {
      const blob = await fetcher();
      downloadBlob(blob, filename);
      addNotification(`${filename} downloaded securely.`, 'success');
      if (activeTab === 'history') loadHistory();
    } catch {
      addNotification('Export failed. Ensure the server has data for this report.', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const jsonToCsv = (data: any, filename: string, reportId: string, suffix: string, title: string) =>
    triggerExport(
      async () => new Blob(['\ufeff' + toCsv(Array.isArray(data) ? data : [data])], { type: 'text/csv;charset=utf-8' }),
      filename,
      `${reportId}-${suffix}`,
      title,
    );

  const reports = [
    {
      id: 'alumni',
      title: 'Alumni Master List',
      desc: 'Complete list of all registered alumni with profile, education, and contact information.',
      exportCsv: () => triggerExport(() => adminApi.reportAlumni('csv'), 'alumni-list.csv', 'alumni-csv', 'Alumni Master List (CSV)'),
      exportJson: () => triggerExport(() => adminApi.reportAlumni('json'), 'alumni-list.json', 'alumni-json', 'Alumni Master List (JSON)'),
    },
    {
      id: 'employment',
      title: 'Graduate Employment Report',
      desc: 'Employment records of graduates including company, position, industry, and status.',
      exportCsv: () => triggerExport(() => adminApi.reportEmployment('csv'), 'graduate-employment.csv', 'employment-csv', 'Graduate Employment Report (CSV)'),
      exportJson: () => triggerExport(() => adminApi.reportEmployment('json'), 'graduate-employment.json', 'employment-json', 'Graduate Employment Report (JSON)'),
    },
    {
      id: 'employer',
      title: 'Employer & Partner Directory',
      desc: 'List of registered companies, industries, locations, and partnership statuses.',
      exportCsv: () => triggerExport(() => adminApi.reportEmployer('csv'), 'employer-report.csv', 'employer-csv', 'Employer Directory (CSV)'),
      exportJson: () => triggerExport(() => adminApi.reportEmployer('json'), 'employer-report.json', 'employer-json', 'Employer Directory (JSON)'),
    },
    {
      id: 'salary',
      title: 'Salary Distribution Report',
      desc: 'Distribution of reported salaries by monthly salary bracket across alumni.',
      exportCsv: () => triggerExport(() => adminApi.salaryDistributionCsv(), 'salary-distribution.csv', 'salary-csv', 'Salary Distribution Report (CSV)'),
      exportJson: () => triggerExport(() => adminApi.salaryDistribution().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'salary-distribution.json', 'salary-json', 'Salary Distribution Report (JSON)'),
    },
    {
      id: 'employment-rate',
      title: 'Employment Rate by Course',
      desc: 'Employment rate breakdown by degree program and graduation year.',
      exportCsv: () => triggerExport(() => adminApi.employmentByCourseCsv(), 'employment-rate-by-course.csv', 'erate-csv', 'Employment Rate by Course (CSV)'),
      exportJson: () => triggerExport(() => adminApi.employmentByCourse().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'employment-rate.json', 'erate-json', 'Employment Rate by Course (JSON)'),
    },
    {
      id: 'curriculum',
      title: 'Degree Alignment & Tracer Study',
      desc: 'Degree-to-employment alignment rate, curriculum feedback, and skill demand metrics.',
      exportCsv: () => triggerExport(() => adminApi.degreeAlignmentCsv(), 'degree-alignment.csv', 'curriculum-csv', 'Degree Alignment Report (CSV)'),
      exportJson: () => triggerExport(() => adminApi.degreeAlignment().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'degree-alignment.json', 'curriculum-json', 'Degree Alignment Report (JSON)'),
    },
    {
      id: 'survey-completion',
      title: 'Survey Completion Report',
      desc: 'Survey response counts, target counts, and completion rates.',
      exportCsv: () => adminApi.surveyList().then((surveys: any) => jsonToCsv(
        (surveys || []).map((s: any) => ({
          title: s.title,
          status: s.status,
          responseCount: s.responseCount || 0,
          targetCount: s.targetCount || 0,
          rate: s.targetCount ? `${Math.round(((s.responseCount || 0) / s.targetCount) * 100)}%` : 'N/A',
        })),
        'survey-completion.csv',
        'survey',
        'csv',
        'Survey Completion Report',
      )),
      exportJson: () => triggerExport(() => adminApi.surveyList().then((surveys: any) => new Blob([JSON.stringify(surveys, null, 2)], { type: 'application/json' })), 'survey-completion.json', 'survey-json', 'Survey Completion Report (JSON)'),
    },
    {
      id: 'batch-employment',
      title: 'Batch Employment Report',
      desc: 'Employment trends and statistics grouped by graduation batch year.',
      exportCsv: () => adminApi.employmentByBatch().then((d: any) => jsonToCsv(d, 'batch-employment.csv', 'batch', 'csv', 'Batch Employment Report')),
      exportJson: () => triggerExport(() => adminApi.employmentByBatch().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'batch-employment.json', 'batch-json', 'Batch Employment Report (JSON)'),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-orange-500" />
            Reports &amp; Analytics Export
          </h1>
          <p className="text-xs text-gray-500">
            Generate, download, and audit institutional alumni data and career reports.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reports' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Available Reports
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Export Audit History
          </button>
        </div>
      </div>

      {/* Compliance Banner */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/70 via-white to-purple-50/40 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 text-purple-700 mt-0.5">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              Proper Use of Reports and Analytics (RA 10173 Compliance)
            </h4>
            <p className="text-xs text-purple-950/80 mt-1 leading-relaxed">
              Career analytics and reports must only be accessed by authorized users. Reports containing alumni personal information must not be shared with unauthorized individuals. All exported files are watermarked and permanently audit-logged.
            </p>
          </div>
        </div>
      </div>

      {/* Tab 1: Available Reports */}
      {activeTab === 'reports' && (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                  <DocumentTextIcon className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{report.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{report.desc}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={report.exportCsv}
                      disabled={generating === report.id + '-csv'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      {generating === report.id + '-csv' ? 'Generating...' : 'Export CSV'}
                    </button>
                    <button
                      onClick={report.exportJson}
                      disabled={generating === report.id + '-json'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      {generating === report.id + '-json' ? 'Generating...' : 'Export JSON'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Export Audit History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Immutable Export Audit Trail</h3>
              <p className="text-xs text-gray-500">
                Log of all exported alumni data files as mandated by institutional policy and the Data Privacy Act.
              </p>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-orange-500' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Report Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Format</th>
                  <th className="py-2.5 px-4">Records</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Exported At</th>
                  <th className="py-2.5 px-4">DPA Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No report exports logged yet.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{item.report_name}</td>
                      <td className="py-2.5 px-4">{item.report_type}</td>
                      <td className="py-2.5 px-4 uppercase font-mono font-bold text-orange-600">{item.format}</td>
                      <td className="py-2.5 px-4 font-mono">{item.record_count?.toLocaleString() || '0'}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px]">{item.ip_address || 'unknown'}</td>
                      <td className="py-2.5 px-4 text-gray-500">
                        {new Date(item.exported_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <ShieldCheckIcon className="w-3 h-3" />
                          Logged
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

      {/* Pre-Export Confidentiality Acknowledgement Modal (Rule 5) */}
      {pendingExport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-purple-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <ScaleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Confidentiality Acknowledgment
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              You are exporting <strong>{pendingExport.title}</strong> containing sensitive alumni information.
            </p>

            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 mb-4 text-xs text-purple-950 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-purple-700 shrink-0" />
                Data Privacy Act of 2012 (RA 10173) &amp; Institutional Policy:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-purple-900/85">
                <li>This report must not be shared with unauthorized individuals.</li>
                <li>Downloaded records must be stored securely and deleted when no longer required.</li>
                <li>This download has been assigned to your user account in the audit log.</li>
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
                onClick={confirmAndDownload}
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
