import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { adminApi } from '@/services/api';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  StarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  GlobeAltIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  XMarkIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ArrowTopRightOnSquareIcon,
  HandThumbUpIcon,
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
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  partnership_status: 'partner' | 'non-partner';
  is_verified: boolean;
  is_active: boolean;
  alumniCount?: number;
  jobsCount?: number;
  created_at: string;
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
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    industry: 'Technology / IT',
    partnership_status: 'partner' as 'partner' | 'non-partner',
    is_verified: true,
    website: '',
    contact_email: '',
    contact_phone: '',
    city: '',
    province: '',
    address: '',
    description: '',
  });

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
        const raw = res?.data || [];
        const partners = raw.filter((c: any) => c.partnership_status === 'partner').length;
        const verified = raw.filter((c: any) => c.is_verified).length;
        const alumniAtPartners = raw
          .filter((c: any) => c.partnership_status === 'partner')
          .reduce((acc: number, c: any) => acc + (c.alumniCount || 0), 0);
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
      partnership_status: 'partner',
      is_verified: true,
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
    setFormData({
      name: c.name || '',
      industry: c.industry || 'Other',
      partnership_status: c.partnership_status || 'non-partner',
      is_verified: Boolean(c.is_verified),
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Company name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        await adminApi.companyUpdate(editingCompany.id, formData);
        showNotification(`Updated ${formData.name} successfully`);
      } else {
        await adminApi.companyCreate(formData);
        showNotification(`Added ${formData.name} as a partner company`);
      }
      setModalOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to save company', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePartnership = async (c: Company) => {
    const nextStatus = c.partnership_status === 'partner' ? 'non-partner' : 'partner';
    try {
      await adminApi.companyTogglePartnership(c.id, nextStatus);
      showNotification(
        nextStatus === 'partner'
          ? `Marked ${c.name} as an Official Partner!`
          : `Removed partnership status from ${c.name}`
      );
      // Optimistic update
      setCompanies((prev) =>
        prev.map((item) =>
          item.id === c.id ? { ...item, partnership_status: nextStatus } : item
        )
      );
      setStats((prev) => ({
        ...prev,
        partners: nextStatus === 'partner' ? prev.partners + 1 : Math.max(0, prev.partners - 1),
      }));
    } catch (err: any) {
      showNotification(err?.message || 'Failed to update partnership status', 'error');
    }
  };

  const handleToggleVerify = async (c: Company) => {
    try {
      const res = await adminApi.companyVerify(c.id);
      const isVerified = res?.is_verified ?? !c.is_verified;
      showNotification(isVerified ? `Verified ${c.name}` : `Unverified ${c.name}`);
      setCompanies((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, is_verified: isVerified } : item))
      );
      setStats((prev) => ({
        ...prev,
        verified: isVerified ? prev.verified + 1 : Math.max(0, prev.verified - 1),
      }));
    } catch (err: any) {
      showNotification(err?.message || 'Failed to toggle verification', 'error');
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
    const headers = ['Name', 'Industry', 'Partnership Status', 'Verified', 'Alumni Count', 'City', 'Province', 'Website', 'Email', 'Phone'];
    const rows = filteredCompanies.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.industry || '').replace(/"/g, '""')}"`,
      c.partnership_status === 'partner' ? 'Partner' : 'Non-partner',
      c.is_verified ? 'Yes' : 'No',
      c.alumniCount || 0,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.province || '').replace(/"/g, '""')}"`,
      `"${(c.website || '').replace(/"/g, '""')}"`,
      `"${(c.contact_email || '').replace(/"/g, '""')}"`,
      `"${(c.contact_phone || '').replace(/"/g, '""')}"`,
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

  // Filtered List
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        const matchInd = c.industry?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCity && !matchInd) return false;
      }

      // Partnership filter
      if (partnershipFilter === 'partner' && c.partnership_status !== 'partner') return false;
      if (partnershipFilter === 'non-partner' && c.partnership_status !== 'non-partner') return false;

      // Verification filter
      if (verifiedFilter === 'verified' && !c.is_verified) return false;
      if (verifiedFilter === 'unverified' && c.is_verified) return false;

      // Industry
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
          {notification.type === 'error' ? <XMarkIcon className="w-4 h-4" /> : <CheckBadgeIcon className="w-4 h-4 text-emerald-600" />}
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
            Manage corporate affiliations, institutional MOUs/MOAs, hiring partnerships, and verified employers.
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
                  Active MOA
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-orange-600 leading-none">{stats.partners}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Partner Companies</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400">
                {stats.total > 0 ? `${Math.round((stats.partners / stats.total) * 100)}% of registered organizations` : 'Official partnerships'}
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
                  Legitimacy
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-emerald-600 leading-none">{stats.verified}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Verified Employers</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400">
                Validated by administration
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
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Grid View"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-orange-600 font-semibold' : 'text-gray-400 hover:text-gray-700'
                }`}
                title="Table View"
              >
                <TableCellsIcon className="w-4 h-4" />
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
            All Organizations ({companies.length})
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
            <span>Official Partners ({companies.filter((c) => c.partnership_status === 'partner').length})</span>
          </button>
          <button
            onClick={() => setPartnershipFilter('non-partner')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              partnershipFilter === 'non-partner'
                ? 'bg-gray-700 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            Non-Partners ({companies.filter((c) => c.partnership_status === 'non-partner').length})
          </button>

          <span className="text-gray-300 mx-1">|</span>

          <button
            onClick={() => setVerifiedFilter(verifiedFilter === 'verified' ? 'all' : 'verified')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              verifiedFilter === 'verified'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckBadgeIcon className="w-3.5 h-3.5" />
            <span>Verified Only ({companies.filter((c) => c.is_verified).length})</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100 rounded-full shrink-0" />
                  <div className="h-4 w-20 bg-gray-100 rounded shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-100">
            <BuildingOffice2Icon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No companies found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            {search || partnershipFilter !== 'all' || selectedIndustry !== 'all'
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
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((c) => {
            const isPartner = c.partnership_status === 'partner';
            return (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md group relative ${
                  isPartner ? 'border-orange-200/90 hover:border-orange-300' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  {/* Top Bar: Icon + Status Badges */}
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
                          {c.is_verified && (
                            <CheckBadgeIcon className="w-4 h-4 text-emerald-600 shrink-0" title="Verified Employer" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.industry || 'General Industry'}</p>
                      </div>
                    </div>

                    {/* Partnership Pill */}
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

                  {/* Location & Contact Snippet */}
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
                  <div className="flex items-center gap-1.5">
                    {/* Toggle Partner Button */}
                    <button
                      onClick={() => handleTogglePartnership(c)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isPartner
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                      }`}
                      title={isPartner ? 'Demote to regular company' : 'Upgrade to partner company'}
                    >
                      {isPartner ? <StarSolid className="w-3.5 h-3.5 text-amber-500" /> : <StarIcon className="w-3.5 h-3.5" />}
                      <span>{isPartner ? 'Partner' : 'Make Partner'}</span>
                    </button>

                    {/* Toggle Verify Button */}
                    <button
                      onClick={() => handleToggleVerify(c)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        c.is_verified
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                      title={c.is_verified ? 'Click to unverify' : 'Click to verify employer'}
                    >
                      <CheckBadgeIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Edit, Details & Delete Actions */}
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
      ) : (
        /* Table View */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Company Name</th>
                  <th className="py-3 px-4 font-semibold">Industry</th>
                  <th className="py-3 px-4 font-semibold">Partnership Status</th>
                  <th className="py-3 px-4 font-semibold">Verification</th>
                  <th className="py-3 px-4 font-semibold text-center">Alumni Hired</th>
                  <th className="py-3 px-4 font-semibold text-center">Active Jobs</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCompanies.map((c) => {
                  const isPartner = c.partnership_status === 'partner';
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPartner ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-snug">{c.name}</p>
                            {c.website && (
                              <a
                                href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-orange-600 hover:underline inline-block truncate max-w-[150px]"
                              >
                                {c.website.replace(/^https?:\/\/(www\.)?/, '')}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.industry || '—'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleTogglePartnership(c)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            isPartner
                              ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                              : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {isPartner && <StarSolid className="w-2.5 h-2.5 text-amber-500" />}
                          <span>{isPartner ? 'Partner' : 'Regular'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleVerify(c)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer ${
                            c.is_verified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <CheckBadgeIcon className="w-3 h-3" />
                          <span>{c.is_verified ? 'Verified' : 'Unverified'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{c.alumniCount || 0}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{c.jobsCount || 0}</td>
                      <td className="py-3 px-4 text-gray-500 text-[11px]">{[c.city, c.province].filter(Boolean).join(', ') || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/employers/${encodeURIComponent(c.name)}`}
                            className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                            title="Analytics"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
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
      )}

      {/* Add / Edit Company Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs" onClick={() => setModalOpen(false)}>
          <div className="bg-white border border-gray-100 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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
                    Configure institutional details, industry, and partnership agreement
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
                  placeholder="e.g. Luna Café, Accenture, Lexmark"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Industry & Partnership Status */}
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
                    Partnership Status
                  </label>
                  <select
                    value={formData.partnership_status}
                    onChange={(e) =>
                      setFormData({ ...formData, partnership_status: e.target.value as 'partner' | 'non-partner' })
                    }
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white font-medium text-gray-800"
                  >
                    <option value="partner">★ Official Partner (MOU/MOA)</option>
                    <option value="non-partner">Regular Employer</option>
                  </select>
                </div>
              </div>

              {/* Website & Contact Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* Phone, City, Province */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Naga City, Cebu City"
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

              {/* Description & Partnership Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                  Partnership Notes & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the company, MOU details, internship agreements, or hiring collaboration history..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-orange-500 resize-none leading-relaxed"
                />
              </div>

              {/* Verified Checkbox */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_verified"
                  checked={formData.is_verified}
                  onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="is_verified" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Mark as Verified Employer (authorizes priority listing & trusted badge)
                </label>
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
    </div>
  );
}
