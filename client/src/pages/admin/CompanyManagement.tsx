import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { adminApi } from '@/services/api';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  GlobeAltIcon,
  MapPinIcon,
  XMarkIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { SkeletonStatCard } from '@/components/ui/Skeleton';

const INDUSTRIES = [
  'Technology / IT',
  'Software & Services',
  'Telecommunications',
  'Business Process Outsourcing (BPO)',
  'Finance & Banking',
  'Healthcare & Pharmaceuticals',
  'Education & Training',
  'Manufacturing & Industrial',
  'Food and Beverage',
  'Retail & E-commerce',
  'Construction & Real Estate',
  'Government & Public Sector',
  'Other',
];

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country?: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  employer_type: 'regular' | 'partner';
  partnership_status: 'partner' | 'non-partner';
  agreement_type?: 'MOU' | 'MOA' | null;
  agreement_title?: string | null;
  agreement_number?: string | null;
  agreement_file?: string | null;
  agreement_start_date?: string | null;
  agreement_end_date?: string | null;
  agreement_status?: 'active' | 'expired' | null;
  agreement_verification_status?: 'pending' | 'verified' | 'rejected' | 'none' | null;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  is_verified: boolean;
  is_active: boolean;
  alumniCount?: number;
  jobsCount?: number;
  created_at: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Indefinite';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    partners: 0,
    verified: 0,
    alumniAtPartners: 0,
  });

  // Filters & Search
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const [partnershipFilter, setPartnershipFilter] = useState<'all' | 'partner' | 'non-partner'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    industry: 'Technology / IT',
    employer_type: 'partner' as 'regular' | 'partner',
    partnership_status: 'partner' as 'partner' | 'non-partner',
    agreement_type: 'MOA' as 'MOU' | 'MOA',
    agreement_title: '',
    agreement_number: '',
    agreement_file: '',
    agreement_start_date: '',
    agreement_end_date: '',
    agreement_status: 'active' as 'active' | 'expired',
    verification_notes: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    province: '',
    address: '',
    description: '',
  });

  // Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyingCompany, setVerifyingCompany] = useState<Company | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<'pending' | 'verified' | 'rejected'>('verified');
  const [verificationNotesInput, setVerificationNotesInput] = useState('');
  const [savingVerification, setSavingVerification] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await adminApi.companyList({ limit: 200 });
      setCompanies(res?.data || []);
      if (res?.stats) {
        setStats(res.stats);
      } else {
        const raw: Company[] = res?.data || [];
        const partners = raw.filter((c) => c.partnership_status === 'partner' || c.employer_type === 'partner').length;
        const verified = raw.filter((c) => c.is_verified || c.agreement_verification_status === 'verified').length;
        const alumniAtPartners = raw
          .filter((c) => c.partnership_status === 'partner' || c.employer_type === 'partner')
          .reduce((acc: number, c) => acc + (c.alumniCount || 0), 0);
        setStats({
          total: raw.length,
          partners,
          verified,
          alumniAtPartners,
        });
      }
    } catch (err: any) {
      showNotification(err?.message || 'Failed to load companies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      industry: 'Technology / IT',
      employer_type: 'partner',
      partnership_status: 'partner',
      agreement_type: 'MOA',
      agreement_title: '',
      agreement_number: '',
      agreement_file: '',
      agreement_start_date: new Date().toISOString().split('T')[0],
      agreement_end_date: '',
      agreement_status: 'active',
      verification_notes: '',
      website: '',
      contact_email: '',
      contact_phone: '',
      city: '',
      province: '',
      address: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Company) => {
    setEditingCompany(c);
    const isPartner = c.employer_type === 'partner' || c.partnership_status === 'partner';
    setFormData({
      name: c.name || '',
      industry: c.industry || 'Other',
      employer_type: isPartner ? 'partner' : 'regular',
      partnership_status: isPartner ? 'partner' : 'non-partner',
      agreement_type: (c.agreement_type as 'MOU' | 'MOA') || 'MOA',
      agreement_title: c.agreement_title || '',
      agreement_number: c.agreement_number || '',
      agreement_file: c.agreement_file || '',
      agreement_start_date: c.agreement_start_date ? c.agreement_start_date.split('T')[0] : '',
      agreement_end_date: c.agreement_end_date ? c.agreement_end_date.split('T')[0] : '',
      agreement_status: (c.agreement_status as 'active' | 'expired') || 'active',
      verification_notes: c.verification_notes || '',
      website: c.website || '',
      contact_email: c.contact_email || '',
      contact_phone: c.contact_phone || '',
      city: c.city || '',
      province: c.province || '',
      address: c.address || '',
      description: c.description || '',
    });
    setModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showNotification('Only PDF files are supported for agreements', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        agreement_file: reader.result as string,
        agreement_title: prev.agreement_title || file.name.replace(/\.pdf$/i, ''),
      }));
      showNotification(`Attached document: "${file.name}"`);
    };
    reader.readAsDataURL(file);
  };

  const handleViewPdf = (pdfUrlOrData: string) => {
    if (!pdfUrlOrData) return;
    if (pdfUrlOrData.startsWith('data:') || pdfUrlOrData.startsWith('http')) {
      const win = window.open();
      if (win) {
        if (pdfUrlOrData.startsWith('data:application/pdf')) {
          win.document.write(
            `<title>Agreement Document</title><body style="margin:0;height:100%"><iframe src="${pdfUrlOrData}" frameborder="0" style="border:0;width:100%;height:100%" allowfullscreen></iframe></body>`
          );
        } else {
          win.location.href = pdfUrlOrData;
        }
      }
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Company name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        ...formData,
        partnership_status: formData.employer_type === 'partner' ? 'partner' : 'non-partner',
      };
      if (formData.employer_type !== 'partner') {
        payload.agreement_type = null;
        payload.agreement_title = null;
        payload.agreement_number = null;
        payload.agreement_file = null;
        payload.agreement_start_date = null;
        payload.agreement_end_date = null;
        payload.agreement_status = null;
      }

      if (editingCompany) {
        await adminApi.companyUpdate(editingCompany.id, payload);
        showNotification(`Updated ${formData.name} successfully`);
      } else {
        await adminApi.companyCreate(payload);
        showNotification(`Added ${formData.name} successfully`);
      }
      setModalOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to save company', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenVerify = (c: Company) => {
    setVerifyingCompany(c);
    const current = c.agreement_verification_status;
    setVerificationDecision(
      current === 'verified' || current === 'rejected' || current === 'pending'
        ? current
        : c.is_verified ? 'verified' : 'pending'
    );
    setVerificationNotesInput(c.verification_notes || '');
    setVerifyModalOpen(true);
  };

  const handleSaveVerification = async () => {
    if (!verifyingCompany) return;
    setSavingVerification(true);
    try {
      const res = await adminApi.companyVerifyAgreement(verifyingCompany.id, {
        verification_status: verificationDecision,
        notes: verificationNotesInput.trim() || undefined,
      });
      showNotification(res?.message || 'Verification status updated successfully');
      setVerifyModalOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to save verification', 'error');
    } finally {
      setSavingVerification(false);
    }
  };

  const handleDelete = async (c: Company) => {
    if (!window.confirm(`Are you sure you want to remove "${c.name}"?`)) return;
    try {
      await adminApi.companyDelete(c.id);
      showNotification(`Deleted ${c.name}`);
      setCompanies((prev) => prev.filter((item) => item.id !== c.id));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        partners: c.partnership_status === 'partner' ? Math.max(0, prev.partners - 1) : prev.partners,
      }));
    } catch (err: any) {
      showNotification(err?.message || 'Failed to delete company', 'error');
    }
  };

  const handleSyncEmployers = async () => {
    setSyncing(true);
    try {
      const res = await adminApi.companySyncEmployers();
      showNotification(res?.message || 'Sync completed successfully');
      await fetchCompanies();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to sync employers', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCsv = () => {
    if (companies.length === 0) return;
    const headers = [
      'Company Name',
      'Employer Status',
      'Agreement Type',
      'Agreement Title',
      'Agreement Number',
      'Agreement Status',
      'Effective Date',
      'Expiration Date',
      'Verification Status',
      'Industry',
      'City',
      'Province',
      'Website',
      'Contact Email',
    ];
    const rows = filteredCompanies.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.employer_type === 'partner' || c.partnership_status === 'partner' ? 'Official Partner' : 'Regular Employer',
      c.agreement_type || 'None',
      `"${(c.agreement_title || '').replace(/"/g, '""')}"`,
      `"${(c.agreement_number || '').replace(/"/g, '""')}"`,
      c.agreement_status || 'N/A',
      c.agreement_start_date ? formatDate(c.agreement_start_date) : '',
      c.agreement_end_date ? formatDate(c.agreement_end_date) : '',
      c.agreement_verification_status || (c.is_verified ? 'verified' : 'pending'),
      `"${(c.industry || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.province || '').replace(/"/g, '""')}"`,
      `"${(c.website || '').replace(/"/g, '""')}"`,
      `"${(c.contact_email || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner_companies_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        const matchInd = c.industry?.toLowerCase().includes(q);
        const matchTitle = c.agreement_title?.toLowerCase().includes(q);
        const matchNum = c.agreement_number?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCity && !matchInd && !matchTitle && !matchNum) return false;
      }

      const isPartner = c.employer_type === 'partner' || c.partnership_status === 'partner';
      if (partnershipFilter === 'partner' && !isPartner) return false;
      if (partnershipFilter === 'non-partner' && isPartner) return false;

      if (verifiedFilter === 'verified' && c.agreement_verification_status !== 'verified' && !c.is_verified) return false;
      if (verifiedFilter === 'pending' && c.agreement_verification_status !== 'pending') return false;
      if (verifiedFilter === 'rejected' && c.agreement_verification_status !== 'rejected') return false;

      if (selectedIndustry !== 'all' && c.industry !== selectedIndustry) return false;

      return true;
    });
  }, [companies, search, partnershipFilter, verifiedFilter, selectedIndustry]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border transition-all animate-fade-in ${
            notification.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <XCircleIcon className="w-4 h-4 text-red-600" />
          ) : (
            <CheckBadgeIcon className="w-4 h-4 text-emerald-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Partner Companies</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              {stats.partners} Active Partners
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage corporate affiliations, institutional MOUs/MOAs, hiring partnerships, and agreement verifications.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSyncEmployers}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            title="Import distinct company names from alumni employment records"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 text-gray-500 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync from Alumni'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={companies.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Partner Company</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                  <BuildingOffice2Icon className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60">
                  Institutional
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-orange-600 leading-none">{stats.partners}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Official Partners</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400">
                {stats.total > 0 ? `${Math.round((stats.partners / stats.total) * 100)}% of directory` : 'Formal partnerships'}
              </div>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Directory
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-indigo-600 leading-none">{stats.total}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Total Organizations</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400">
                {stats.total - stats.partners} regular employers
              </div>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Verified
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-emerald-600 leading-none">{stats.verified}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Verified Partners & Employers</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400">
                Authorized by administration
              </div>
            </div>

            <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <UserGroupIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  Employment
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-blue-600 leading-none">{stats.alumniAtPartners}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Alumni at Partners</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400">
                Hired through partner networks
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter & Options Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {search ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 font-medium shrink-0">
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>Search: <strong>"{search}"</strong> ({filteredCompanies.length} found)</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete('q');
                    setSearchParams(next, { replace: true });
                  }}
                  className="ml-1 text-orange-600 hover:text-orange-900 p-0.5 rounded cursor-pointer transition-colors"
                  title="Clear search"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-800">{filteredCompanies.length}</span> of <span className="font-bold text-gray-800">{companies.length}</span> organizations
              </div>
            )}
          </div>

          {/* Industry Filter & View Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 bg-white font-medium text-gray-700 cursor-pointer"
            >
              <option value="all">All Industries</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 rounded-xl p-0.5 bg-gray-50 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Grid View"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-400 text-[11px] font-medium mr-1">Status:</span>
          <button
            onClick={() => setPartnershipFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              partnershipFilter === 'all'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            All ({companies.length})
          </button>
          <button
            onClick={() => setPartnershipFilter('partner')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              partnershipFilter === 'partner'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <StarSolid className="w-3 h-3 text-amber-300" />
            <span>Official Partners ({companies.filter((c) => c.employer_type === 'partner' || c.partnership_status === 'partner').length})</span>
          </button>
          <button
            onClick={() => setPartnershipFilter('non-partner')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              partnershipFilter === 'non-partner'
                ? 'bg-gray-700 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            Regular Employers ({companies.filter((c) => c.employer_type !== 'partner' && c.partnership_status !== 'partner').length})
          </button>

          <span className="text-gray-300 mx-1">|</span>

          <span className="text-gray-400 text-[11px] font-medium mr-1">Verification:</span>
          <button
            onClick={() => setVerifiedFilter(verifiedFilter === 'verified' ? 'all' : 'verified')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              verifiedFilter === 'verified'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckBadgeIcon className="w-3.5 h-3.5" />
            <span>Verified</span>
          </button>
          <button
            onClick={() => setVerifiedFilter(verifiedFilter === 'pending' ? 'all' : 'pending')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              verifiedFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Pending</span>
          </button>
          <button
            onClick={() => setVerifiedFilter(verifiedFilter === 'rejected' ? 'all' : 'rejected')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              verifiedFilter === 'rejected'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            <XCircleIcon className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-100">
            <BuildingOffice2Icon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No companies found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            {search || partnershipFilter !== 'all' || selectedIndustry !== 'all' || verifiedFilter !== 'all'
              ? 'No organizations match your current search and filter criteria. Try adjusting the filters or resetting search.'
              : 'You have not added any partner companies yet. Add your first partner company or sync existing employer records from alumni!'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2.5">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Partner Company</span>
            </button>
            <button
              onClick={handleSyncEmployers}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 text-gray-500 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync from Alumni</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View matching exact user structure */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Company</th>
                  <th className="py-3.5 px-4 font-semibold">Employer Status</th>
                  <th className="py-3.5 px-4 font-semibold">Agreement</th>
                  <th className="py-3.5 px-4 font-semibold">Agreement Status</th>
                  <th className="py-3.5 px-4 font-semibold">Valid Until</th>
                  <th className="py-3.5 px-4 font-semibold">Verification</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanies.map((c) => {
                  const isPartner = c.employer_type === 'partner' || c.partnership_status === 'partner';
                  const isVerified = c.agreement_verification_status === 'verified' || (c.is_verified && c.agreement_verification_status !== 'rejected');
                  const isRejected = c.agreement_verification_status === 'rejected';

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Company identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPartner ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-gray-900 leading-snug truncate max-w-[200px]">{c.name}</p>
                              {isVerified && (
                                <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Verified" />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 truncate max-w-[220px]">
                              {c.industry || 'General Industry'}
                              {(c.city || c.province) && ` • ${[c.city, c.province].filter(Boolean).join(', ')}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Employer Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPartner
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {isPartner && <StarSolid className="w-2.5 h-2.5 text-amber-500" />}
                          <span>{isPartner ? 'Official Partner' : 'Regular Employer'}</span>
                        </span>
                      </td>

                      {/* Agreement: MOU / MOA / None */}
                      <td className="py-3 px-4">
                        {isPartner && c.agreement_type ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[10px] border border-gray-200">
                              {c.agreement_type}
                            </span>
                            {c.agreement_file && (
                              <button
                                type="button"
                                onClick={() => handleViewPdf(c.agreement_file!)}
                                className="text-orange-600 hover:text-orange-800 p-0.5"
                                title="View Agreement PDF"
                              >
                                <EyeIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>

                      {/* Agreement Status: Active / Expired */}
                      <td className="py-3 px-4">
                        {isPartner ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                              c.agreement_status === 'expired'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {c.agreement_status || 'Active'}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Valid Until */}
                      <td className="py-3 px-4 text-gray-600">
                        {isPartner && c.agreement_end_date ? (
                          <span className="font-medium text-gray-700">{formatDate(c.agreement_end_date)}</span>
                        ) : isPartner ? (
                          <span className="text-gray-400">Indefinite</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Verification: Admin verification */}
                      <td className="py-3 px-4">
                        {isVerified ? (
                          <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>✓ Verified Partner</span>
                            </span>
                            {c.agreement_type && (
                              <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                                {c.agreement_type} • {c.agreement_end_date ? `Active until ${formatDate(c.agreement_end_date)}` : 'Active'}
                              </span>
                            )}
                          </div>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <XCircleIcon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Rejected</span>
                          </span>
                        ) : isPartner ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <ClockIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Pending Verification</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Standard Employer</span>
                        )}
                      </td>

                      {/* Actions: View / Edit / Verify */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/employers/${encodeURIComponent(c.name)}`}
                            className="px-2 py-1 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 font-medium text-[11px] inline-flex items-center gap-0.5 transition-colors"
                            title="View Employer Analytics & Hires"
                          >
                            <span>View</span>
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="px-2 py-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium text-[11px] inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                            title="Edit Company Details"
                          >
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleOpenVerify(c)}
                            className="px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Review & Verify Agreement"
                          >
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verify</span>
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer ml-0.5"
                            title="Delete Company"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((c) => {
            const isPartner = c.employer_type === 'partner' || c.partnership_status === 'partner';
            const isVerified = c.agreement_verification_status === 'verified' || (c.is_verified && c.agreement_verification_status !== 'rejected');
            const isRejected = c.agreement_verification_status === 'rejected';

            return (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md group relative ${
                  isPartner ? 'border-orange-200/90 hover:border-orange-300' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  {/* Top Bar: Icon + Verification / Partnership Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                          isPartner
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-300 shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="text-sm font-bold text-gray-900 truncate leading-snug group-hover:text-orange-600 transition-colors">
                            {c.name}
                          </h2>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.industry || 'General Industry'}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 tracking-wide uppercase ${
                        isPartner
                          ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {isPartner ? <StarSolid className="w-2.5 h-2.5 text-amber-500" /> : null}
                      <span>{isPartner ? 'Partner' : 'Regular'}</span>
                    </span>
                  </div>

                  {/* Verification Banner */}
                  <div className="mb-3">
                    {isVerified ? (
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                          <CheckBadgeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>✓ Verified Partner</span>
                        </div>
                        {c.agreement_type && (
                          <span className="text-[10px] text-emerald-700 font-medium truncate">
                            {c.agreement_type} • {c.agreement_end_date ? `Valid to ${formatDate(c.agreement_end_date)}` : 'Active'}
                          </span>
                        )}
                      </div>
                    ) : isRejected ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-2 flex items-center gap-1.5 text-xs text-red-700 font-bold">
                        <XCircleIcon className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Agreement Verification Rejected</span>
                      </div>
                    ) : isPartner ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                          <ClockIcon className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Pending Verification</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenVerify(c)}
                          className="text-[10px] font-bold text-amber-900 underline cursor-pointer"
                        >
                          Verify Now
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Location & Website */}
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    {(c.city || c.province) && (
                      <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                        <MapPinIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{[c.city, c.province].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {c.website && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <GlobeAltIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a
                          href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline truncate"
                        >
                          {c.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Description / Notes */}
                  {c.description && (
                    <p className="text-xs text-gray-600 bg-gray-50/70 rounded-xl p-2.5 line-clamp-2 leading-relaxed border border-gray-100 mb-3">
                      {c.description}
                    </p>
                  )}

                  {/* Agreement document preview if attached */}
                  {c.agreement_file && (
                    <div className="mb-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <DocumentTextIcon className="w-3.5 h-3.5 text-orange-600" />
                        <span>Agreement PDF</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewPdf(c.agreement_file!)}
                        className="text-orange-600 hover:underline text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>
                  )}

                  {/* Metrics Badges: Alumni & Jobs */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      <UserGroupIcon className="w-3.5 h-3.5" />
                      <span>{c.alumniCount || 0} Alumni</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <BriefcaseIcon className="w-3.5 h-3.5" />
                      <span>{c.jobsCount || 0} Openings</span>
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenVerify(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verify</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <Link
                      to={`/admin/employers/${encodeURIComponent(c.name)}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      title="View Employer Analytics & Hires"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit Company Details"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete Company"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Company Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white border border-gray-100 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white shrink-0">
                  <BuildingOffice2Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingCompany ? 'Edit Partner Company' : 'Add Partner Company'}
                  </h3>
                  <p className="text-xs text-orange-100 mt-0.5">
                    Configure company identity, partnership agreement, and institutional terms
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {/* Company Name */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Technologies, Accenture, Lexmark"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Partnership Status Selector (Regular Employer vs Official Partner) */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Partnership Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, employer_type: 'regular', partnership_status: 'non-partner' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.employer_type === 'regular'
                        ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900 text-xs">Regular Employer</span>
                      {formData.employer_type === 'regular' && <CheckCircleIcon className="w-4 h-4 text-orange-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Standard employer hiring graduates without institutional MOU/MOA.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, employer_type: 'partner', partnership_status: 'partner' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.employer_type === 'partner'
                        ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900 text-xs flex items-center gap-1">
                        <StarSolid className="w-3.5 h-3.5 text-amber-500" />
                        Official Partner
                      </span>
                      {formData.employer_type === 'partner' && <CheckCircleIcon className="w-4 h-4 text-orange-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Affiliated partner with signed MOU / MOA agreement.
                    </p>
                  </button>
                </div>
              </div>

              {/* Conditional Partnership Agreement Section */}
              {formData.employer_type === 'partner' && (
                <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60">
                    <DocumentTextIcon className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Partnership Agreement
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold ml-auto">
                      Requires Admin Verification
                    </span>
                  </div>

                  {/* Agreement Type & Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Agreement Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.agreement_type}
                        onChange={(e) => setFormData({ ...formData, agreement_type: e.target.value as 'MOU' | 'MOA' })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white font-medium"
                      >
                        <option value="MOA">MOA (Memorandum of Agreement)</option>
                        <option value="MOU">MOU (Memorandum of Understanding)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Agreement Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Industry Academe Linkage & OJT Agreement"
                        value={formData.agreement_title}
                        onChange={(e) => setFormData({ ...formData, agreement_title: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Reference Number & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Agreement Number / Ref No. <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CTU-ABC-MOA-2026"
                        value={formData.agreement_number}
                        onChange={(e) => setFormData({ ...formData, agreement_number: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Agreement Status
                      </label>
                      <select
                        value={formData.agreement_status}
                        onChange={(e) => setFormData({ ...formData, agreement_status: e.target.value as 'active' | 'expired' })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  {/* Effective Date & Expiration Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        value={formData.agreement_start_date}
                        onChange={(e) => setFormData({ ...formData, agreement_start_date: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                        Expiration Date <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.agreement_end_date}
                        onChange={(e) => setFormData({ ...formData, agreement_end_date: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Upload Agreement (PDF) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                      Upload Agreement (PDF)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer">
                        <DocumentArrowDownIcon className="w-4 h-4 text-orange-600" />
                        <span>{formData.agreement_file ? 'Replace PDF Document' : 'Upload Agreement (PDF)'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </label>
                      {formData.agreement_file ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                          <span>PDF Document Attached</span>
                          <button
                            type="button"
                            onClick={() => handleViewPdf(formData.agreement_file)}
                            className="text-orange-600 hover:underline inline-flex items-center gap-0.5 ml-1 cursor-pointer"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">PDF document only</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 italic">
                      Note: Uploading an agreement does not automatically mean verified legitimacy. Verification is evaluated by administration.
                    </p>
                  </div>

                  {/* Agreement Notes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                      Agreement Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Special provisions, liaison contacts, renewal terms..."
                      value={formData.verification_notes}
                      onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Industry & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://company.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Contact Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="partnerships@company.com"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+63 912 345 6789"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* City & Province */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cebu City, Mandaue City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    Province
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cebu"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Full Street Address
                </label>
                <input
                  type="text"
                  placeholder="Building, Street, District"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500"
                />
              </div>

              {/* General Description */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Company Overview & Profile
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the company, business lines, and hiring focus..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 resize-none leading-relaxed"
                />
              </div>

              {/* Modal Buttons */}
              <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {saving ? 'Saving...' : editingCompany ? 'Save Changes' : 'Create Partner Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agreement Verification Modal */}
      {verifyModalOpen && verifyingCompany && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs"
          onClick={() => setVerifyModalOpen(false)}
        >
          <div
            className="bg-white border border-gray-100 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Agreement Verification</h3>
                  <p className="text-xs text-teal-100 mt-0.5">{verifyingCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Agreement Metadata Summary */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Agreement Type:</span>
                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {verifyingCompany.agreement_type || 'MOA'}
                  </span>
                </div>
                {verifyingCompany.agreement_title && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Agreement Title:</span>
                    <span className="font-medium text-gray-900 text-right truncate max-w-[250px]">{verifyingCompany.agreement_title}</span>
                  </div>
                )}
                {verifyingCompany.agreement_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Reference No:</span>
                    <span className="font-mono text-gray-800 font-semibold">{verifyingCompany.agreement_number}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Validity Period:</span>
                  <span className="font-medium text-gray-800">
                    {verifyingCompany.agreement_start_date ? formatDate(verifyingCompany.agreement_start_date) : 'N/A'}
                    {' — '}
                    {verifyingCompany.agreement_end_date ? formatDate(verifyingCompany.agreement_end_date) : 'Indefinite'}
                  </span>
                </div>
                {verifyingCompany.agreement_file ? (
                  <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Uploaded Document:</span>
                    <button
                      type="button"
                      onClick={() => handleViewPdf(verifyingCompany.agreement_file!)}
                      className="inline-flex items-center gap-1 text-orange-600 font-bold hover:underline cursor-pointer"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>View PDF Agreement</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-gray-200/60 text-gray-400 italic">
                    No PDF agreement document attached
                  </div>
                )}
              </div>

              {/* Verification Decision Radios */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                  Verification Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerificationDecision('verified')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      verificationDecision === 'verified'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-500 shadow-2xs'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircleIcon className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <span>Verified</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationDecision('pending')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      verificationDecision === 'pending'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold ring-1 ring-amber-500 shadow-2xs'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ClockIcon className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <span>Pending</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationDecision('rejected')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      verificationDecision === 'rejected'
                        ? 'border-red-500 bg-red-50 text-red-800 font-bold ring-1 ring-red-500 shadow-2xs'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <XCircleIcon className="w-5 h-5 mx-auto mb-1 text-red-600" />
                    <span>Rejected</span>
                  </button>
                </div>
              </div>

              {/* Verification Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Verification Notes & Rationale
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Validated against institutional records. Notarized MOA on file with University Legal Office."
                  value={verificationNotesInput}
                  onChange={(e) => setVerificationNotesInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Past verification evaluate info */}
              {verifyingCompany.verified_at && (
                <div className="bg-gray-50/80 rounded-xl p-2.5 text-[11px] text-gray-500 border border-gray-100">
                  <span className="font-semibold text-gray-700">Previous Evaluation: </span>
                  Reviewed on {formatDate(verifyingCompany.verified_at)}
                  {verifyingCompany.verification_notes && (
                    <p className="mt-0.5 italic">"{verifyingCompany.verification_notes}"</p>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingVerification}
                  onClick={handleSaveVerification}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>{savingVerification ? 'Saving...' : 'Confirm Verification'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
