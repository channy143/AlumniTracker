import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/authStore';
import { surveyApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

interface ConsentData {
  agreed: boolean;
  collectProcess: boolean;
  storeRetain: boolean;
  congratulatoryBanners: boolean;
  promotionalDiscounts: boolean;
  jobOpportunities: boolean;
}

export default function AlumniOnboardingSurveyPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  // Step 1: Consent (all checkboxes start UNCHECKED so the user must check them)
  const [consent, setConsent] = useState<ConsentData>({
    agreed: false,
    collectProcess: false,
    storeRetain: false,
    congratulatoryBanners: false,
    promotionalDiscounts: false,
    jobOpportunities: false,
  });

  // Step 2: Personal & Contact Details
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    studentId: '',
    email: '',
    phone: '',
    gender: 'Prefer not to say',
    civilStatus: 'Single',
    address: '',
    city: '',
    province: 'Cebu',
    currentResidenceLocation: 'Within Cebu / Naga City',
  });

  // Step 3: Academic Background (No employment!)
  const [academicInfo, setAcademicInfo] = useState({
    program: '',
    yearGraduated: '',
    honors: 'None',
    licensureStatus: 'Not Applicable',
    licensureExamName: '',
    reasonsForEnrolling: [] as string[],
  });

  // Step 4: Skills & Lifelong Learning (No employment!)
  const [skillsInfo, setSkillsInfo] = useState({
    furtherStudies: 'No plans at this time',
    postGradCertifications: '',
    competenciesDeveloped: [] as string[],
  });

  // Step 5: CTU Institutional Feedback & Engagement
  const [feedbackInfo, setFeedbackInfo] = useState({
    curriculumRelevance: 'Very Relevant',
    facultyRating: '5',
    facilitiesRating: '5',
    studentServicesRating: '5',
    engagementPreferences: [] as string[],
    suggestions: '',
  });

  useEffect(() => {
    surveyApi
      .getOnboarding()
      .then((res) => {
        if (res.completed) {
          if (user && !user.survey_completed) {
            setUser({ ...user, survey_completed: true });
          }
          navigate('/', { replace: true });
          return;
        }

        if (res.profile) {
          setPersonalInfo((prev) => ({
            ...prev,
            firstName: res.profile.firstName || prev.firstName,
            lastName: res.profile.lastName || prev.lastName,
            middleName: res.profile.middleName || prev.middleName,
            email: res.profile.email || prev.email,
            phone: res.profile.phone || prev.phone,
            studentId: res.profile.studentId || prev.studentId,
            gender: res.profile.gender || prev.gender,
            civilStatus: res.profile.civilStatus || prev.civilStatus,
            address: res.profile.address || prev.address,
            city: res.profile.city || prev.city,
            province: res.profile.province || prev.province || 'Cebu',
          }));

          setAcademicInfo((prev) => ({
            ...prev,
            program: res.profile.program || prev.program,
            yearGraduated: res.profile.yearGraduated ? String(res.profile.yearGraduated) : prev.yearGraduated,
            honors: res.profile.honors || prev.honors,
          }));
        }
      })
      .catch(() => {
        if (user) {
          setPersonalInfo((prev) => ({
            ...prev,
            email: user.email || prev.email,
            firstName: user.first_name || prev.firstName,
            lastName: user.last_name || prev.lastName,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [navigate, user, setUser]);

  const toggleItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleToggleSelectAllConsent = () => {
    const allChecked =
      consent.collectProcess &&
      consent.storeRetain &&
      consent.congratulatoryBanners &&
      consent.promotionalDiscounts &&
      consent.jobOpportunities;

    const nextState = !allChecked;
    setConsent((prev) => ({
      ...prev,
      collectProcess: nextState,
      storeRetain: nextState,
      congratulatoryBanners: nextState,
      promotionalDiscounts: nextState,
      jobOpportunities: nextState,
    }));
  };

  const validateCurrentStep = (currentStep: number): boolean => {
    setValidationError('');
    if (currentStep === 1) {
      if (!consent.agreed) {
        setValidationError('Please check the agreement box to accept the Data Privacy Consent.');
        return false;
      }
      if (
        !consent.collectProcess ||
        !consent.storeRetain ||
        !consent.congratulatoryBanners ||
        !consent.promotionalDiscounts ||
        !consent.jobOpportunities
      ) {
        setValidationError('Please check all authorization checkboxes to authorize processing of your alumni information.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!personalInfo.phone.trim()) {
        setValidationError('Please enter your contact / mobile number.');
        return false;
      }
      if (!personalInfo.city.trim()) {
        setValidationError('Please specify your City / Municipality.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!academicInfo.program.trim()) {
        setValidationError('Please specify your Degree / Program.');
        return false;
      }
      if (!academicInfo.yearGraduated.trim()) {
        setValidationError('Please provide your graduation year.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep(step)) return;
    if (step < 5) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    setValidationError('');
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep(step)) return;
    setSubmitting(true);
    try {
      const payload = {
        consent,
        responses: {
          ...personalInfo,
          ...academicInfo,
          ...skillsInfo,
          ...feedbackInfo,
        },
      };

      await surveyApi.submitOnboarding(payload);

      if (user) {
        setUser({ ...user, survey_completed: true });
      }

      setIsSuccessModalOpen(true);
      addNotification('Survey submitted successfully!', 'success');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit survey. Please try again.');
      addNotification(err.message || 'Failed to submit survey', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sectionTitles = [
    'User Consent (Data Privacy)',
    'Personal & Contact Details',
    'Educational Background & Licensure',
    'Skills & Lifelong Learning',
    'Graduate Feedback & Institutional Evaluation',
  ];

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Loading survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-gray-50 flex flex-col justify-center items-center p-3 sm:p-4 select-none">
      <div className="max-w-2xl w-full flex flex-col justify-between overflow-hidden max-h-[96vh]">
        {/* Top Survey Header Card - Matches SurveyPage.tsx exactly */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-2.5 shadow-xs shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                CTU-Naga Graduate Tracer & Alumni Registration Survey
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Cebu Technological University &bull; Naga Extension Campus &bull; Alumni Affairs Office
              </p>
            </div>
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 shrink-0">
              Registration
            </span>
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i <= step ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              Section {step} of 5 &bull; {sectionTitles[step - 1]}
            </span>
          </div>

          <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Card - Matches SurveyPage.tsx exactly, fits viewport without scrollview */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-xs flex-1 flex flex-col justify-between overflow-hidden">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-sm font-bold text-gray-900">
              {sectionTitles[step - 1]}
            </h2>
            {validationError && (
              <span className="text-[11px] text-red-500 font-medium truncate max-w-xs">
                {validationError}
              </span>
            )}
          </div>

          {/* Form Step Body - fits comfortably within viewport, no scrollbar */}
          <div className="flex-1 flex flex-col justify-center overflow-y-auto scrollbar-hover pr-0.5">
            <AnimatePresence mode="wait">
              {/* STEP 1: USER CONSENT (DATA PRIVACY ACT RA 10173) */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed space-y-2">
                    <p className="font-semibold text-gray-900">
                      In compliance with RA10173 otherwise known as Data Privacy Act (DPA) of 2012, and its implementing Rules and Guidelines:
                    </p>
                    <p className="text-gray-600">
                      I agree and authorize the Alumni Affairs Office of Cebu Technological University (CTU) to:
                    </p>

                    {/* Checkboxes - UNCHECKED BY DEFAULT */}
                    <div className="space-y-1.5 pt-1">
                      {[
                        {
                          key: 'collectProcess',
                          text: 'Collect, access, dispose and/or process my information for registration as Alumni of CTU.',
                        },
                        {
                          key: 'storeRetain',
                          text: 'Store and retain my information as Alumni of CTU.',
                        },
                        {
                          key: 'congratulatoryBanners',
                          text: 'Include my name and photo in congratulatory banners for board exam success and similar accomplishments.',
                        },
                        {
                          key: 'promotionalDiscounts',
                          text: 'Inform me through the contact details I provided about Alumni Activities and Alumni promotional discounts.',
                        },
                        {
                          key: 'jobOpportunities',
                          text: 'Provide my name, course, and contact number to companies for possible job opportunities.',
                        },
                      ].map((item) => {
                        const isChecked = (consent as any)[item.key];
                        return (
                          <label
                            key={item.key}
                            className={`flex items-start gap-2.5 p-1.5 rounded cursor-pointer transition-colors ${
                              isChecked ? 'bg-orange-50/60' : 'hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setConsent((prev) => ({ ...prev, [item.key]: e.target.checked }))
                              }
                              className="sr-only"
                            />
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-orange-500 border border-orange-500 text-white shadow-xs'
                                  : 'border border-gray-300 bg-white hover:border-orange-400'
                              }`}
                            >
                              {isChecked && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                            </div>
                            <span className="text-xs text-gray-700">{item.text}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleToggleSelectAllConsent}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                      >
                        {consent.collectProcess &&
                        consent.storeRetain &&
                        consent.congratulatoryBanners &&
                        consent.promotionalDiscounts &&
                        consent.jobOpportunities
                          ? 'Deselect all'
                          : 'Select all authorizations'}
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-200 leading-normal">
                      I understand that Cebu Technological University values my rights as data subject under the DPA. To exercise such rights, I may contact the data protection officer through{' '}
                      <a href="mailto:dataprivacy@ctu.edu.ph" className="text-orange-600 font-semibold hover:underline">
                        dataprivacy@ctu.edu.ph
                      </a>.
                    </p>
                  </div>

                  {/* Overarching Consent Agreement Checkbox - UNCHECKED BY DEFAULT */}
                  <label className="flex items-center gap-2.5 p-2.5 bg-orange-50/50 border border-orange-200 rounded-lg cursor-pointer transition-colors hover:bg-orange-50/80">
                    <input
                      type="checkbox"
                      checked={consent.agreed}
                      onChange={(e) => setConsent((prev) => ({ ...prev, agreed: e.target.checked }))}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                        consent.agreed
                          ? 'bg-orange-500 border border-orange-500 text-white shadow-xs'
                          : 'border border-gray-300 bg-white hover:border-orange-400'
                      }`}
                    >
                      {consent.agreed && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    <span className="text-xs font-semibold text-gray-900">
                      I have read, understood, and accept the User Consent and Data Privacy terms under RA 10173.
                    </span>
                  </label>
                </motion.div>
              )}

              {/* STEP 2: PERSONAL & CONTACT INFORMATION */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        disabled
                        value={personalInfo.firstName}
                        className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        disabled
                        value={personalInfo.lastName}
                        className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Middle Name</label>
                      <input
                        type="text"
                        placeholder="Optional"
                        value={personalInfo.middleName}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, middleName: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Student / Alumni ID</label>
                      <input
                        type="text"
                        disabled
                        value={personalInfo.studentId}
                        className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        disabled
                        value={personalInfo.email}
                        className="w-full text-xs border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Contact / Mobile No. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="0917 123 4567"
                        value={personalInfo.phone}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        value={personalInfo.gender}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, gender: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Civil Status</label>
                      <select
                        value={personalInfo.civilStatus}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, civilStatus: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        City / Municipality <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. City of Naga, Cebu"
                        value={personalInfo.city}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, city: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-gray-100">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Street / Barangay Address</label>
                      <input
                        type="text"
                        placeholder="House No., Street, Barangay"
                        value={personalInfo.address}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, address: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Current Living Location</label>
                      <select
                        value={personalInfo.currentResidenceLocation}
                        onChange={(e) => setPersonalInfo((p) => ({ ...p, currentResidenceLocation: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="Within Cebu / Naga City">Within Cebu / Naga City</option>
                        <option value="Metro Manila / NCR">Metro Manila / NCR</option>
                        <option value="Other Philippine Region">Other Philippine Region</option>
                        <option value="Overseas / OFW">Overseas / OFW</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: EDUCATIONAL BACKGROUND & LICENSURE */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="col-span-2 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Degree / Program Graduated at CTU <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={academicInfo.program}
                        onChange={(e) => setAcademicInfo((a) => ({ ...a, program: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Graduation Year <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={academicInfo.yearGraduated}
                        onChange={(e) => setAcademicInfo((a) => ({ ...a, yearGraduated: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Academic Honors</label>
                      <select
                        value={academicInfo.honors}
                        onChange={(e) => setAcademicInfo((a) => ({ ...a, honors: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="None">None</option>
                        <option value="Summa Cum Laude">Summa Cum Laude</option>
                        <option value="Magna Cum Laude">Magna Cum Laude</option>
                        <option value="Cum Laude">Cum Laude</option>
                        <option value="Dean's Lister">Dean's Lister</option>
                        <option value="Leadership Awardee">Leadership Awardee</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Professional Licensure / Board Exam
                      </label>
                      <select
                        value={academicInfo.licensureStatus}
                        onChange={(e) => setAcademicInfo((a) => ({ ...a, licensureStatus: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="Passed">Passed (PRC Licensed / CSC Eligible)</option>
                        <option value="Scheduled / Reviewing">Scheduled / Currently Reviewing</option>
                        <option value="Planning to take">Planning to take in the future</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Exam / License Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. LET, REE, ME, CSC Prof."
                        value={academicInfo.licensureExamName}
                        onChange={(e) => setAcademicInfo((a) => ({ ...a, licensureExamName: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>

                  {/* Reasons for choosing CTU - UNCHECKED BY DEFAULT */}
                  <div className="pt-1.5 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Primary reasons for enrolling at CTU (Select all that apply):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        'High board exam passing rate & technical standards',
                        'Faculty competence & state university prestige',
                        'Free Higher Education subsidy (RA 10931)',
                        'Proximity to residence in Naga / Southern Cebu',
                        'Recommended by family, peers & alumni',
                        'Passion for the degree program',
                      ].map((reason) => {
                        const isChecked = academicInfo.reasonsForEnrolling.includes(reason);
                        return (
                          <label
                            key={reason}
                            className={`flex items-center gap-2 text-xs text-gray-700 cursor-pointer rounded px-2 py-1 transition-colors ${
                              isChecked ? 'bg-orange-50 text-orange-950 font-medium' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                toggleItem(academicInfo.reasonsForEnrolling, reason, (v) =>
                                  setAcademicInfo((a) => ({ ...a, reasonsForEnrolling: v }))
                                )
                              }
                              className="sr-only"
                            />
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-orange-500 border border-orange-500 text-white shadow-xs'
                                  : 'border border-gray-300 bg-white hover:border-orange-400'
                              }`}
                            >
                              {isChecked && <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />}
                            </div>
                            <span>{reason}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: SKILLS & LIFELONG LEARNING (ZERO EMPLOYMENT) */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Post-Graduate / Further Studies Status
                      </label>
                      <select
                        value={skillsInfo.furtherStudies}
                        onChange={(e) => setSkillsInfo((s) => ({ ...s, furtherStudies: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="Enrolled in Master's / Doctorate / Law / Medicine">
                          Enrolled in Master's / Doctorate / Law / Medicine
                        </option>
                        <option value="Planning to enroll within 1-2 years">Planning to enroll within 1-2 years</option>
                        <option value="No plans at this time">No plans at this time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Post-Grad Certifications & Seminars (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cisco CCNA, TESDA NC II, Safety Officer..."
                        value={skillsInfo.postGradCertifications}
                        onChange={(e) => setSkillsInfo((s) => ({ ...s, postGradCertifications: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>

                  {/* Core Competencies - UNCHECKED BY DEFAULT */}
                  <div className="pt-1.5 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Core competencies acquired from CTU education:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        'Technical & Practical Engineering / IT Skills',
                        'Critical Thinking & Analytical Problem Solving',
                        'Communication Skills (Oral & Written)',
                        'Work Ethics, Professional Discipline & Values',
                        'Teamwork & Collaboration in Industry',
                        'Leadership & Community Service Responsiveness',
                      ].map((skill) => {
                        const isChecked = skillsInfo.competenciesDeveloped.includes(skill);
                        return (
                          <label
                            key={skill}
                            className={`flex items-center gap-2 text-xs text-gray-700 cursor-pointer rounded px-2 py-1 transition-colors ${
                              isChecked ? 'bg-orange-50 text-orange-950 font-medium' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                toggleItem(skillsInfo.competenciesDeveloped, skill, (v) =>
                                  setSkillsInfo((s) => ({ ...s, competenciesDeveloped: v }))
                                )
                              }
                              className="sr-only"
                            />
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-orange-500 border border-orange-500 text-white shadow-xs'
                                  : 'border border-gray-300 bg-white hover:border-orange-400'
                              }`}
                            >
                              {isChecked && <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />}
                            </div>
                            <span>{skill}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                    <span className="font-semibold text-gray-800">Employment Section:</span> Per university guidelines, your employment details will be updated in your career profile once hired for a position.
                  </div>
                </motion.div>
              )}

              {/* STEP 5: GRADUATE FEEDBACK & INSTITUTIONAL EVALUATION */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Curriculum Relevance to Professional Readiness:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Extremely Relevant', 'Very Relevant', 'Moderately Relevant', 'Slightly Relevant'].map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2 text-xs cursor-pointer rounded-lg border px-3 py-2 transition-all ${
                            feedbackInfo.curriculumRelevance === opt
                              ? 'border-orange-500 bg-orange-50/60 font-semibold text-orange-900'
                              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="curriculumRelevance"
                            value={opt}
                            checked={feedbackInfo.curriculumRelevance === opt}
                            onChange={() => setFeedbackInfo((f) => ({ ...f, curriculumRelevance: opt }))}
                            className="accent-orange-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Faculty Evaluation</label>
                      <select
                        value={feedbackInfo.facultyRating}
                        onChange={(e) => setFeedbackInfo((f) => ({ ...f, facultyRating: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="5">5 - Outstanding</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Satisfactory</option>
                        <option value="2">2 - Fair</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Laboratories & Facilities</label>
                      <select
                        value={feedbackInfo.facilitiesRating}
                        onChange={(e) => setFeedbackInfo((f) => ({ ...f, facilitiesRating: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="5">5 - Outstanding</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Satisfactory</option>
                        <option value="2">2 - Fair</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Student Guidance & Services</label>
                      <select
                        value={feedbackInfo.studentServicesRating}
                        onChange={(e) => setFeedbackInfo((f) => ({ ...f, studentServicesRating: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                      >
                        <option value="5">5 - Outstanding</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Satisfactory</option>
                        <option value="2">2 - Fair</option>
                      </select>
                    </div>
                  </div>

                  {/* Engagement preferences - UNCHECKED BY DEFAULT */}
                  <div className="pt-1.5 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Ways you would like to stay engaged with CTU-Naga:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        'Alumni Homecoming & Chapter Reunions',
                        'Mentoring Current CTU Students',
                        'Campus Job Fairs & Career Talks',
                        'Community Outreach & Extension Projects',
                      ].map((item) => {
                        const isChecked = feedbackInfo.engagementPreferences.includes(item);
                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 text-xs text-gray-700 cursor-pointer rounded px-2 py-1 transition-colors ${
                              isChecked ? 'bg-orange-50 text-orange-950 font-medium' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() =>
                                toggleItem(feedbackInfo.engagementPreferences, item, (v) =>
                                  setFeedbackInfo((f) => ({ ...f, engagementPreferences: v }))
                                )
                              }
                              className="sr-only"
                            />
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-orange-500 border border-orange-500 text-white shadow-xs'
                                  : 'border border-gray-300 bg-white hover:border-orange-400'
                              }`}
                            >
                              {isChecked && <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />}
                            </div>
                            <span>{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Suggestions / Feedback for Curriculum or Institutional Improvement:
                    </label>
                    <input
                      type="text"
                      placeholder="Share recommendations to continually improve student training..."
                      value={feedbackInfo.suggestions}
                      onChange={(e) => setFeedbackInfo((f) => ({ ...f, suggestions: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Actions - Matches SurveyPage.tsx exactly */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1 || submitting}
              className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="px-6 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {submitting ? (
                'Submitting...'
              ) : step === 5 ? (
                'Submit Survey'
              ) : (
                'Next Section'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Completion Modal - Matches SurveyPage / Dashboard styling */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm w-full text-center shadow-lg"
            >
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircleIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">You have completed the survey</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                Thank you for participating. Your responses and Data Privacy Consent have been recorded. Welcome to the CTU-Naga alumni community!
              </p>
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="px-5 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 w-full"
              >
                Back to Home
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
