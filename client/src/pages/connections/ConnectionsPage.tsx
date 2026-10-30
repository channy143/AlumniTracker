import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  HandRaisedIcon,
  ClockIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { connectionsApi, directoryApi, profileApi } from '@/services/api';
import { formatProgramLongName } from '@/utils/formatProgram';
import { useChatStore } from '@/store/chatStore';

type TabType = 'friends' | 'received' | 'sent';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  available_for_referral?: boolean;
  available_for_mentoring?: boolean;
  current_employment?: { company_name: string; position: string } | null;
  education?: { program: string; year_graduated: number } | null;
}

export default function ConnectionsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [results, setResults] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const [openUnfriendId, setOpenUnfriendId] = useState<string | null>(null);
  const limit = 20;

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const [connData, suggData] = await Promise.all([
        connectionsApi.list(),
        connectionsApi.suggestions(),
      ]);
      setConnections(connData || []);
      setSuggestions(suggData || []);
    } catch {
      setConnections([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const doSearch = useCallback(async (q: string, p: number = 1) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setSearching(true);
    setPage(p);
    try {
      const res = await directoryApi.search({ q: q.trim(), page: p, limit });
      setResults(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    profileApi
      .get()
      .then((p) => setMyProfileId(p?.id || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    if (query) {
      doSearch(query, 1);
    }
  }, [query, doSearch]);

  const friendsList = useMemo(() => {
    return connections.filter((c) => c.status === 'accepted');
  }, [connections]);

  const receivedRequests = useMemo(() => {
    return connections.filter((c) => c.status === 'pending' && c.recipient_id === myProfileId);
  }, [connections, myProfileId]);

  const sentRequests = useMemo(() => {
    return connections.filter((c) => c.status === 'pending' && c.requester_id === myProfileId);
  }, [connections, myProfileId]);

  // If there are pending received requests, open received tab if not already on a populated tab
  useEffect(() => {
    if (receivedRequests.length > 0 && friendsList.length === 0 && activeTab === 'friends') {
      setActiveTab('received');
    }
  }, [receivedRequests.length, friendsList.length, activeTab]);

  const handleConnect = async (recipientId: string) => {
    setActionLoadingMap((prev) => ({ ...prev, [recipientId]: true }));
    try {
      await connectionsApi.request(recipientId);
      const connData = await connectionsApi.list();
      setConnections(connData || []);
    } catch (err: any) {
      alert(err.message || 'Connection request failed or already exists.');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [recipientId]: false }));
    }
  };

  const handleRespond = async (id: string, status: 'accepted' | 'declined') => {
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }));
    try {
      await connectionsApi.respond(id, status);
      await fetchConnections();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to request.');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCancelOrRemove = async (id: string) => {
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }));
    try {
      await connectionsApi.remove(id);
      await fetchConnections();
    } catch (err: any) {
      alert(err.message || 'Failed to remove connection.');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleMessage = (profileId: string, name: string, avatar?: string, headline?: string) => {
    useChatStore.getState().openChat({
      profileId,
      name,
      avatar,
      headline,
    });
  };

  const displayedList = useMemo(() => {
    if (activeTab === 'friends') return friendsList;
    if (activeTab === 'received') return receivedRequests;
    if (activeTab === 'sent') return sentRequests;
    return [];
  }, [activeTab, friendsList, receivedRequests, sentRequests]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
            <UserGroupIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">My Connections &amp; Friends</h1>
            <p className="text-xs text-gray-500">Manage your CTU-Naga alumni network, incoming and sent requests</p>
          </div>
        </div>

        <button
          onClick={fetchConnections}
          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
          title="Refresh"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-4">
          {query ? (
            /* Search Query Active */
            searching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl text-center py-12 px-4 shadow-2xs">
                <p className="text-sm font-semibold text-gray-700">No alumni found matching "{query}"</p>
                <p className="text-xs text-gray-400 mt-1">Try searching by full name, major, or company name.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">
                    {total} result{total !== 1 ? 's' : ''} for "{query}"
                  </p>
                </div>
                <div className="space-y-2.5">
                  {results.map((profile) => {
                    const existingFriend = friendsList.find(
                      (c) => c.requester_id === profile.id || c.recipient_id === profile.id
                    );
                    const receivedReq = receivedRequests.find((c) => c.requester_id === profile.id);
                    const sentReq = sentRequests.find((c) => c.recipient_id === profile.id);
                    const isBusy = !!actionLoadingMap[profile.id];
                    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Alumnus';
                    const initials =
                      ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')) || '?';

                    return (
                      <div
                        key={profile.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative shrink-0">
                              {profile.avatar_url ? (
                                <img
                                  src={profile.avatar_url}
                                  alt={fullName}
                                  className="w-11 h-11 rounded-full object-cover ring-1 ring-gray-200"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center text-sm font-bold text-white shadow-2xs">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{fullName}</p>
                              {profile.headline && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{profile.headline}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                {profile.current_employment && (
                                  <span>
                                    {profile.current_employment.position} at{' '}
                                    {profile.current_employment.company_name}
                                  </span>
                                )}
                                {profile.education && (
                                  <span>
                                    {formatProgramLongName(profile.education.program) ||
                                      profile.education.program}{' '}
                                    ({profile.education.year_graduated})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {existingFriend ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenUnfriendId((prev) =>
                                        prev === existingFriend.id ? null : existingFriend.id
                                      )
                                    }
                                    disabled={actionLoadingMap[existingFriend.id]}
                                    className="w-32 h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
                                    title="Click to manage connection"
                                  >
                                    <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      {actionLoadingMap[existingFriend.id]
                                        ? 'Removing...'
                                        : 'Connected'}
                                    </span>
                                    <ChevronDownIcon className="w-3 h-3 shrink-0" />
                                  </button>

                                  {openUnfriendId === existingFriend.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setOpenUnfriendId(null)}
                                      />
                                      <div className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenUnfriendId(null);
                                            handleCancelOrRemove(existingFriend.id);
                                          }}
                                          disabled={actionLoadingMap[existingFriend.id]}
                                          className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <UserMinusIcon className="w-4 h-4 text-red-500 shrink-0" />
                                          <span>Unfriend</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    handleMessage(
                                      profile.id,
                                      fullName,
                                      profile.avatar_url,
                                      profile.headline
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Send Message"
                                >
                                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : receivedReq ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleRespond(receivedReq.id, 'accepted')}
                                  disabled={actionLoadingMap[receivedReq.id]}
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                                >
                                  Confirm Request
                                </button>
                                <button
                                  onClick={() => handleRespond(receivedReq.id, 'declined')}
                                  disabled={actionLoadingMap[receivedReq.id]}
                                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : sentReq ? (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  Requested
                                </span>
                                <button
                                  onClick={() => handleCancelOrRemove(sentReq.id)}
                                  disabled={actionLoadingMap[sentReq.id]}
                                  className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel Request
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleConnect(profile.id)}
                                  disabled={isBusy}
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? (
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <UserPlusIcon className="w-3.5 h-3.5" />
                                      <span>Connect</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    handleMessage(
                                      profile.id,
                                      fullName,
                                      profile.avatar_url,
                                      profile.headline
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Send Message"
                                >
                                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-3">
                    <button
                      disabled={page <= 1}
                      onClick={() => doSearch(query, page - 1)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => doSearch(query, page + 1)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )
          ) : (
            /* Connections Tabs */
            <>
              {/* Segmented Tabs */}
              <div className="bg-white border border-gray-200 rounded-xl p-1.5 flex items-center gap-1 shadow-2xs">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'friends'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>Friends</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'friends' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {friendsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('received')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'received'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>Received Requests</span>
                  {receivedRequests.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeTab === 'received'
                          ? 'bg-white/20 text-white'
                          : 'bg-orange-500 text-white'
                      }`}
                    >
                      {receivedRequests.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('sent')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'sent'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>Sent Requests</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'sent' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {sentRequests.length}
                  </span>
                </button>
              </div>

              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedList.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl text-center py-12 px-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center mb-3">
                    {activeTab === 'friends' ? (
                      <UserGroupIcon className="w-6 h-6" />
                    ) : activeTab === 'received' ? (
                      <UserPlusIcon className="w-6 h-6" />
                    ) : (
                      <ClockIcon className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {activeTab === 'friends'
                      ? 'No connections yet'
                      : activeTab === 'received'
                      ? 'No incoming requests'
                      : 'No pending sent requests'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    {activeTab === 'friends'
                      ? 'Discover and connect with CTU-Naga alumni to grow your professional network.'
                      : activeTab === 'received'
                      ? 'When other alumni send you a connection request, you can confirm or decline them here.'
                      : 'You have not sent any pending requests. Use the search bar to find alumni!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedList.map((conn: any) => {
                    const isRequester = conn.requester_id === myProfileId;
                    const otherProfile = isRequester ? conn.recipient : conn.requester;
                    const fullName =
                      `${otherProfile?.first_name || ''} ${otherProfile?.last_name || ''}`.trim() ||
                      'CTU-Naga Alumnus';
                    const initials =
                      ((otherProfile?.first_name?.[0] || '') + (otherProfile?.last_name?.[0] || '')) ||
                      'A';
                    const isBusy = !!actionLoadingMap[conn.id];

                    return (
                      <div
                        key={conn.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative shrink-0">
                              {otherProfile?.avatar_url ? (
                                <img
                                  src={otherProfile.avatar_url}
                                  alt={fullName}
                                  className="w-11 h-11 rounded-full object-cover ring-1 ring-gray-200"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center text-sm font-bold text-white shadow-2xs">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{fullName}</p>
                              {otherProfile?.headline && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {otherProfile.headline}
                                </p>
                              )}
                              <p className="text-[11px] text-gray-400 mt-1">
                                {conn.created_at
                                  ? `Requested ${new Date(conn.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}`
                                  : 'Active connection'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons depending on tab */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {activeTab === 'received' ? (
                              /* Confirm Request vs Delete Request */
                              <>
                                <button
                                  onClick={() => handleRespond(conn.id, 'accepted')}
                                  disabled={isBusy}
                                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? (
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <CheckIcon className="w-3.5 h-3.5" />
                                      <span>Confirm Request</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRespond(conn.id, 'declined')}
                                  disabled={isBusy}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Delete Request
                                </button>
                              </>
                            ) : activeTab === 'sent' ? (
                              /* Sent Pending Request: Show Requested Badge and Cancel Request */
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  <span>Requested</span>
                                </span>
                                <button
                                  onClick={() => handleCancelOrRemove(conn.id)}
                                  disabled={isBusy}
                                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? 'Canceling...' : 'Cancel Request'}
                                </button>
                              </div>
                            ) : (
                              /* Friends Tab: Connected (with Unfriend menu) and Message */
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenUnfriendId((prev) =>
                                        prev === conn.id ? null : conn.id
                                      )
                                    }
                                    disabled={isBusy}
                                    className="w-32 h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
                                    title="Click to manage connection"
                                  >
                                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{isBusy ? 'Removing...' : 'Connected'}</span>
                                    <ChevronDownIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                                  </button>

                                  {openUnfriendId === conn.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setOpenUnfriendId(null)}
                                      />
                                      <div className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenUnfriendId(null);
                                            handleCancelOrRemove(conn.id);
                                          }}
                                          disabled={isBusy}
                                          className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <UserMinusIcon className="w-4 h-4 text-red-500 shrink-0" />
                                          <span>Unfriend</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() =>
                                    handleMessage(
                                      otherProfile?.id,
                                      fullName,
                                      otherProfile?.avatar_url,
                                      otherProfile?.headline
                                    )
                                  }
                                  className="h-8 px-3 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                                >
                                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 shrink-0" />
                                  <span>Message</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar: Suggested Connections */}
        <aside className="w-full lg:w-80 shrink-0">
          <div className="sticky top-16 bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlusIcon className="w-4 h-4 text-orange-500" />
                <span>Suggested For You</span>
              </h3>
              <span className="text-[10px] bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" />
                Alumni
              </span>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No suggestions available right now</p>
            ) : (
              <div className="space-y-3">
                {suggestions.slice(0, 6).map((s) => {
                  const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Alumnus';
                  const initials = ((s.first_name?.[0] || '') + (s.last_name?.[0] || '')) || 'A';
                  const sentReq = sentRequests.find((c) => c.recipient_id === s.id);
                  const isBusy = !!(actionLoadingMap[s.id] || (sentReq && actionLoadingMap[sentReq.id]));

                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {s.avatar_url ? (
                          <img
                            src={s.avatar_url}
                            alt={fullName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{fullName}</p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {s.headline || 'CTU-Naga Alumnus'}
                          </p>
                        </div>
                      </div>

                      {sentReq ? (
                        <button
                          onClick={() => handleCancelOrRemove(sentReq.id)}
                          disabled={isBusy}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50"
                          title="Cancel connection request"
                        >
                          {isBusy ? 'Canceling...' : 'Cancel Request'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(s.id)}
                          disabled={isBusy}
                          className="px-2.5 py-1 text-xs font-semibold text-orange-600 hover:text-white hover:bg-orange-500 border border-orange-200 hover:border-orange-500 rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? '...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
