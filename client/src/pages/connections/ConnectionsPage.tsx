import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserGroupIcon, UserPlusIcon, CheckIcon, XMarkIcon, ChatBubbleLeftRightIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import { connectionsApi, directoryApi, messagesApi, profileApi } from '@/services/api';

const tabs = ['All', 'Pending', 'Accepted'];

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

  const [activeTab, setActiveTab] = useState('All');
  const [results, setResults] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const limit = 20;

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'All' ? undefined : activeTab.toLowerCase();
      const [connData, suggData] = await Promise.all([
        connectionsApi.list(status),
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
  }, [activeTab]);

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
    profileApi.get().then((p) => setMyProfileId(p?.id || null)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    if (query) {
      doSearch(query, 1);
    }
  }, [query]);

  const handleConnect = async (recipientId: string) => {
    try {
      await connectionsApi.request(recipientId);
      fetchConnections();
    } catch {}
  };

  const handleRespond = async (id: string, status: string) => {
    try {
      await connectionsApi.respond(id, status);
      fetchConnections();
    } catch {}
  };

  const handleRemove = async (id: string) => {
    try {
      await connectionsApi.remove(id);
      fetchConnections();
    } catch {}
  };

  const handleMessage = async (profileId: string, name: string) => {
    const msg = prompt(`Send a message to ${name}:`);
    if (msg && msg.trim()) {
      try {
        await messagesApi.send(profileId, msg.trim());
        alert('Message sent!');
      } catch {}
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
          <UserGroupIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">Connections</h1>
          <p className="text-xs text-gray-500">Search alumni and manage your network</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {query ? (
            searching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">No alumni found matching "{query}"</div>
            ) : (
              <>
                <p className="text-xs text-gray-500">{total} result{total !== 1 ? 's' : ''} for "{query}"</p>
                <div className="space-y-2">
                  {results.map((profile) => (
                    <div key={profile.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {profile.first_name} {profile.last_name}
                            </p>
                            {profile.headline && (
                              <p className="text-xs text-gray-500 truncate">{profile.headline}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                              {profile.current_employment && (
                                <span>{profile.current_employment.position} at {profile.current_employment.company_name}</span>
                              )}
                              {profile.education && (
                                <span>{profile.education.program} ({profile.education.year_graduated})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleConnect(profile.id)}
                            className="p-1.5 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1"
                            title="Connect"
                          >
                            <UserPlusIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMessage(profile.id, `${profile.first_name} ${profile.last_name}`)}
                            className="p-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1"
                            title="Send Message"
                          >
                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                          </button>
                          {profile.available_for_mentoring && (
                            <span className="p-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 flex items-center gap-1" title="Available for Mentoring">
                              <HandRaisedIcon className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => doSearch(query, page - 1)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
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
            <>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">No connections yet. Use the search bar in the header to find alumni!</div>
              ) : (
                <div className="space-y-2">
                  {connections.map((conn: any) => {
                    const otherProfile = conn.requester_id === myProfileId ? conn.recipient : conn.requester;
                    return (
                      <div key={conn.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {((otherProfile?.first_name?.[0] || '') + (otherProfile?.last_name?.[0] || '')) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {otherProfile?.first_name} {otherProfile?.last_name}
                              </p>
                              {otherProfile?.headline && (
                                <p className="text-xs text-gray-500 truncate">{otherProfile.headline}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {conn.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleRespond(conn.id, 'accepted')}
                                  className="p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                  title="Accept"
                                >
                                  <CheckIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRespond(conn.id, 'declined')}
                                  className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  title="Decline"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleMessage(otherProfile?.id, `${otherProfile?.first_name} ${otherProfile?.last_name}`)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Send Message"
                                >
                                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemove(conn.id)}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Remove
                                </button>
                              </>
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

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] scrollbar-hover">
            <div className="pr-1 space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlusIcon className="w-4 h-4 text-orange-500" />
                  Suggested Connections
                </h3>
                {suggestions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No suggestions available</p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {((s.first_name?.[0] || '') + (s.last_name?.[0] || '')) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {s.first_name} {s.last_name}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleConnect(s.id)}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium shrink-0"
                        >
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
