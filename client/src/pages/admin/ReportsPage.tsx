import { useState } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const addNotification = useUIStore((s) => s.addNotification);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleExport = async (fetcher: () => Promise<Blob>, filename: string, reportId: string) => {
    setGenerating(reportId);
    try {
      const blob = await fetcher();
      downloadBlob(blob, filename);
      addNotification(`${filename} downloaded`, 'success');
    } catch {
      addNotification('Export failed. Ensure the server has data for this report.', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const reports = [
    {
      id: 'alumni',
      title: 'Alumni List',
      desc: 'Complete list of all registered alumni with profile, education, and contact information.',
      exportCsv: () => handleExport(() => adminApi.reportAlumni('csv'), 'alumni-list.csv', 'alumni-csv'),
      exportJson: () => handleExport(() => adminApi.reportAlumni('json'), 'alumni-list.json', 'alumni-json'),
    },
    {
      id: 'employment',
      title: 'Graduate Employment Report',
      desc: 'Employment records of graduates including company, position, industry, and salary details.',
      exportCsv: () => handleExport(() => adminApi.reportEmployment('csv'), 'graduate-employment.csv', 'employment-csv'),
      exportJson: () => handleExport(() => adminApi.reportEmployment('json'), 'graduate-employment.json', 'employment-json'),
    },
    {
      id: 'employer',
      title: 'Employer Report',
      desc: 'List of all partner companies, their industry, and alumni employed at each company.',
      exportCsv: () => handleExport(() => adminApi.reportEmployer('csv'), 'employer-report.csv', 'employer-csv'),
      exportJson: () => handleExport(() => adminApi.reportEmployer('json'), 'employer-report.json', 'employer-json'),
    },
    {
      id: 'salary',
      title: 'Salary Report',
      desc: 'Salary distribution across courses, industries, and graduation years.',
      exportCsv: () => handleExport(() => adminApi.reportEmployment('csv'), 'salary-report.csv', 'salary-csv'),
      exportJson: () => handleExport(() => adminApi.reportEmployment('json'), 'salary-report.json', 'salary-json'),
    },
    {
      id: 'employment-rate',
      title: 'Employment Rate Report',
      desc: 'Employment rate breakdown by course, batch year, and industry sector.',
      exportCsv: () => handleExport(() => adminApi.employmentRate().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'text/csv' })), 'employment-rate.csv', 'erate-csv'),
      exportJson: () => handleExport(() => adminApi.employmentRate().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'employment-rate.json', 'erate-json'),
    },
    {
      id: 'curriculum',
      title: 'Curriculum Recommendation Report',
      desc: 'Skills gap analysis, industry demand trends, and curriculum improvement suggestions.',
      exportCsv: () => handleExport(() => adminApi.degreeAlignment().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'text/csv' })), 'curriculum-recommendation.csv', 'curriculum-csv'),
      exportJson: () => handleExport(() => adminApi.degreeAlignment().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'curriculum-recommendation.json', 'curriculum-json'),
    },
    {
      id: 'survey-completion',
      title: 'Survey Completion Report',
      desc: 'Survey response rates, completion statistics, and alumni participation metrics.',
      exportCsv: () => handleExport(() => adminApi.surveyList().then((surveys: any) => new Blob([JSON.stringify(surveys, null, 2)], { type: 'text/csv' })), 'survey-completion.csv', 'survey-csv'),
      exportJson: () => handleExport(() => adminApi.surveyList().then((surveys: any) => new Blob([JSON.stringify(surveys, null, 2)], { type: 'application/json' })), 'survey-completion.json', 'survey-json'),
    },
    {
      id: 'batch-employment',
      title: 'Batch Employment Report',
      desc: 'Employment trends and statistics grouped by graduation batch year.',
      exportCsv: () => handleExport(() => adminApi.employmentByBatch().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'text/csv' })), 'batch-employment.csv', 'batch-csv'),
      exportJson: () => handleExport(() => adminApi.employmentByBatch().then((d: any) => new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), 'batch-employment.json', 'batch-json'),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Reports & Exports</h1>
        <p className="text-xs text-gray-500">Generate and download data reports in CSV or JSON format.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    {generating === report.id + '-csv' ? 'Generating...' : 'Export CSV'}
                  </button>
                  <button
                    onClick={report.exportJson}
                    disabled={generating === report.id + '-json'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
