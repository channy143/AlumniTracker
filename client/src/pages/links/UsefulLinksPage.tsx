import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const links = [
  { name: 'CTU Official Website', url: 'https://www.ctu.edu.ph', desc: 'Visit the official website of Cebu Technological University' },
  { name: 'CTU-Naga Campus', url: 'https://www.ctu.edu.ph/naga', desc: 'CTU-Naga Extension Campus official page' },
];

const onSiteServices = [
  { name: 'Alumni Office', desc: 'Contact and information about the CTU-Naga Alumni Office' },
  { name: 'Registrar', desc: 'Registrar\'s office for records, transcripts, and enrollment' },
  { name: 'Downloadable Forms', desc: 'Download alumni and student forms' },
  { name: 'Alumni ID Application', desc: 'Apply for your official CTU-Naga Alumni ID' },
  { name: 'Employment Verification Request', desc: 'Request employment verification for alumni' },
  { name: 'Graduation Verification Request', desc: 'Request verification of graduation and credentials' },
  { name: 'Academic Calendar', desc: 'View the official academic calendar' },
];

export default function UsefulLinksPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Useful Links</h1>
        <p className="text-xs text-gray-500">Quick access to CTU-Naga online resources and services.</p>
      </div>

      <div className="grid gap-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-orange-200 hover:shadow-sm transition-all group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                {link.name}
              </p>
              <p className="text-xs text-gray-500">{link.desc}</p>
            </div>
            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400 group-hover:text-orange-500 shrink-0" />
          </a>
        ))}
      </div>

      <div className="mt-6 mb-2">
        <h2 className="text-sm font-semibold text-gray-700">On-Campus Services</h2>
        <p className="text-xs text-gray-500">These services are available at the CTU-Naga campus. Visit the Alumni Office or Registrar to process requests.</p>
      </div>

      <div className="grid gap-2">
        {onSiteServices.map((link) => (
          <div
            key={link.name}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{link.name}</p>
              <p className="text-xs text-gray-500">{link.desc}</p>
            </div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide shrink-0">On-campus</span>
          </div>
        ))}
      </div>
    </div>
  );
}
