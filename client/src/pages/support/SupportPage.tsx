import { useState } from 'react';
import { InformationCircleIcon, EnvelopeIcon, ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Profile & Account',
    question: 'How do I update my employment information?',
    answer: 'Go to your Profile page and scroll to the Employment Information section. You can add, edit, or remove your employment records. Keeping this updated helps improve the Career Trends analytics for all alumni.',
  },
  {
    category: 'Profile & Account',
    question: 'How do I update my education and skills?',
    answer: 'From your Profile page, you can add your educational background and skills. This information is used to generate accurate career trend reports and helps employers find qualified alumni.',
  },
  {
    category: 'Profile & Account',
    question: 'Why is my profile completion percentage important?',
    answer: 'A complete profile improves the accuracy of the Alumni Tracking System analytics. It also makes it easier for employers and fellow alumni to find and connect with you. The sidebar shows your completion status and what information is missing.',
  },
  {
    category: 'Profile & Account',
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login page, click "Forgot Password?" Enter your registered email, check for the OTP sent to your inbox, and follow the prompts to set a new password.',
  },
  {
    category: 'Profile & Account',
    question: 'How do I update my personal information?',
    answer: 'Navigate to your Profile page from the navigation menu. You can edit your name, contact details, address, and other personal information.',
  },
  {
    category: 'Career Trends',
    question: 'What is the Career Trends page?',
    answer: 'Career Trends is the alumni career analytics dashboard. It shows employment rates, top industries, common career paths, top employers, and other aggregated data based on alumni employment records.',
  },
  {
    category: 'Career Trends',
    question: 'How is the Career Trends data generated?',
    answer: 'Data comes from two sources: the employment records you add to your profile and the career fields in your profile settings. The system aggregates this anonymized data to show employment patterns across all alumni.',
  },
  {
    category: 'Career Trends',
    question: 'How can I see detailed insights for a specific career?',
    answer: 'Click on any career card on the Career Trends page, or search for a position using the search bar. The detailed view shows employment timeline, industry distribution, related careers, suggested skills, and alumni working in that field.',
  },
  {
    category: 'Career Trends',
    question: 'Can I filter the Career Trends dashboard?',
    answer: 'Yes. Use the Type of Career and Type of Industry dropdowns to filter the career cards. You can also sort by Most Experienced or Least Experienced. The header search bar searches across all career data including positions, employers, and industries.',
  },
  {
    category: 'Directory & Networking',
    question: 'How do I search for other alumni?',
    answer: 'Go to the Alumni Directory page from the navigation menu. You can search by name, headline, or company. Click on any profile to view their full details.',
  },
  {
    category: 'Directory & Networking',
    question: 'What is the "Recent Checked Alumnis" section?',
    answer: 'The sidebar shows the last 10 alumni profiles you have viewed. This makes it easy to return to profiles you recently checked without having to search again.',
  },
  {
    category: 'Directory & Networking',
    question: 'How do I find alumni working at a specific company?',
    answer: 'Use the header search bar to search for the company name. The Career Trends page also shows Top Companies Employing Alumni, and you can click through to see detailed career insights.',
  },
  {
    category: 'Events & Announcements',
    question: 'Where can I find upcoming events?',
    answer: 'The Home page shows the latest announcements and upcoming events. You can also visit the Events page to view all events, filter by upcoming or past, and see details like date, time, and location.',
  },
  {
    category: 'Events & Announcements',
    question: 'How do I view past announcements?',
    answer: 'Use the filter buttons on the Home page to switch between All, Announcements, and Events. You can also click "View All" on the Latest Announcements sidebar widget.',
  },
  {
    category: 'Data & Privacy',
    question: 'Who can see my employment information?',
    answer: 'Your profile is visible to all verified alumni. The aggregated data shown on the Career Trends dashboard is anonymized — individual alumni are not identified in the charts and statistics.',
  },
  {
    category: 'Data & Privacy',
    question: 'How is my data used in the Alumni Tracking System?',
    answer: 'Your employment and education data is aggregated with other alumni data to generate career trend reports, employment statistics, and industry insights. Individual data is never shared publicly.',
  },
  {
    category: 'Technical',
    question: 'The Career Trends charts are not loading. What should I do?',
    answer: 'Try refreshing the page. If the API is unavailable, the page will display sample data so you can still see the layout. Clear your browser cache or try a different browser if the issue persists.',
  },
  {
    category: 'Technical',
    question: 'I didn\'t receive the OTP email. What now?',
    answer: 'Check your spam or junk folder first. Make sure you entered the correct email address. If you still don\'t see it, wait 30 seconds before requesting a new OTP. Contact the Alumni Office if the problem continues.',
  },
];

const categories = [...new Set(faqs.map((f) => f.category))];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Frequently Asked Questions</h2>
      <p className="text-xs text-gray-500 mb-4">Find answers about the CTU-Naga Alumni Tracking System.</p>

      {categories.map((category) => (
        <div key={category} className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
          <div className="space-y-1">
            {faqs.filter((f) => f.category === category).map((faq, idx) => {
              const globalIdx = faqs.indexOf(faq);
              const isOpen = openIndex === globalIdx;
              return (
                <div key={globalIdx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : globalIdx)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RightSidebar() {
  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <InformationCircleIcon className="w-4 h-4 text-orange-500" />
          About the System
        </h3>
        <div className="space-y-3 text-xs text-gray-600">
          <p>
            The CTU-Naga Alumni Tracking System is designed to track and analyze alumni career outcomes. By keeping your profile updated, you contribute to accurate employment data that benefits the entire alumni community.
          </p>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">Key Features</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Career Trends analytics dashboard</li>
              <li>Employment status tracking</li>
              <li>Alumni directory and search</li>
              <li>Event management and announcements</li>
              <li>Profile and career data management</li>
            </ul>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <p className="font-medium text-gray-800 mb-1">Data Accuracy Matters</p>
            <p className="text-gray-500">The Career Trends dashboard is only as accurate as the data alumni provide. Please keep your employment and education information up to date.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <EnvelopeIcon className="w-4 h-4 text-orange-500" />
          Contact Alumni Office
        </h3>
        <div className="space-y-3 text-xs text-gray-600">
          <p>The CTU-Naga Alumni Office is here to help. Reach out through any of the following channels:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <EnvelopeIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <span>alumni.office@ctu-naga.edu.ph</span>
            </div>
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-gray-400 shrink-0" />
              <span>(032) 123-4567</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <h4 className="font-medium text-gray-800 mb-1">Office Hours</h4>
            <p>Monday - Friday: 8:00 AM - 5:00 PM</p>
            <p>Saturday: 8:00 AM - 12:00 PM</p>
            <p className="text-gray-400">Closed on Sundays and holidays</p>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <h4 className="font-medium text-gray-800 mb-1">Location</h4>
            <p>CTU-Naga Extension Campus</p>
            <p>Naga City, Cebu, Philippines</p>
            <p className="text-gray-400">Alumni Office, 2nd Floor Admin Building</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="font-medium text-gray-800 mb-1">Report an Issue</p>
            <p className="text-gray-500">Experiencing a technical problem? Let us know and we'll get back to you within 24 hours.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">Support</h1>
          <p className="text-xs text-gray-500">Help Center, FAQ, and ways to reach us</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <FAQSection />
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] scrollbar-hover">
            <div className="pr-1">
              <RightSidebar />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
