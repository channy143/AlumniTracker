import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const addNotification = useUIStore((s) => s.addNotification);

  const handleExport = async (fetcher: () => Promise<Blob>, filename: string) => {
    try {
      const blob = await fetcher();
      downloadBlob(blob, filename);
      addNotification(`${filename} downloaded`, 'success');
    } catch { addNotification('Export failed', 'error'); }
  };

  const reports = [
    { title: 'Alumni Report', desc: 'Complete list of all alumni with profile and education data', exportCsv: () => handleExport(() => adminApi.reportAlumni('csv'), 'alumni-report.csv'), exportJson: () => handleExport(() => adminApi.reportAlumni('json'), 'alumni-report.json') },
    { title: 'Employment Report', desc: 'Employment records with company, position, and industry details', exportCsv: () => handleExport(() => adminApi.reportEmployment('csv'), 'employment-report.csv'), exportJson: () => handleExport(() => adminApi.reportEmployment('json'), 'employment-report.json') },
    { title: 'Employer Report', desc: 'List of all partner companies and their details', exportCsv: () => handleExport(() => adminApi.reportEmployer('csv'), 'employer-report.csv'), exportJson: () => handleExport(() => adminApi.reportEmployer('json'), 'employer-report.json') },
    { title: 'Career Progress Report', desc: 'Career progression timeline for each alumni', exportCsv: () => handleExport(() => adminApi.reportCareerProgress('csv'), 'career-progress.csv'), exportJson: () => handleExport(() => adminApi.reportCareerProgress('json'), 'career-progress.json') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Reports</h1>
        <p className="text-gray-500 mt-1">Generate and export data reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <div key={report.title} className="card">
            <h3 className="font-semibold text-ctu-charcoal">{report.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{report.desc}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={report.exportCsv} className="btn-primary text-sm px-4">Export CSV</button>
              <button onClick={report.exportJson} className="btn-secondary text-sm px-4">Export JSON</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
