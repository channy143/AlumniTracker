import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const links = [
  { name: 'CTU Official Website', url: 'https://www.ctu.edu.ph', desc: 'Visit the official website of Cebu Technological University' },
  { name: 'CTU-Naga Campus', url: 'https://www.ctu.edu.ph/naga', desc: 'CTU-Naga Extension Campus official page' },
  { name: 'Alumni Office', url: '#', desc: 'Contact and information about the CTU-Naga Alumni Office' },
  { name: 'Registrar', url: '#', desc: 'Registrar\'s office for records, transcripts, and enrollment' },
  { name: 'Downloadable Forms', url: '#', desc: 'Download alumni and student forms' },
  { name: 'Alumni ID Application', url: '#', desc: 'Apply for your official CTU-Naga Alumni ID' },
  { name: 'Employment Verification Request', url: '#', desc: 'Request employment verification for alumni' },
  { name: 'Graduation Verification Request', url: '#', desc: 'Request verification of graduation and credentials' },
  { name: 'Academic Calendar', url: '#', desc: 'View the official academic calendar' },
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
    </div>
  );
}
