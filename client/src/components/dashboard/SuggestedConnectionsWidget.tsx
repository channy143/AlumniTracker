import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlusIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { connectionsApi } from '@/services/api';
import { useChatStore } from '@/store/chatStore';

interface SuggestedPerson {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  headline?: string;
}

export default function SuggestedConnectionsWidget() {
  const navigate = useNavigate();
  const { openChat } = useChatStore();
  const [suggestions, setSuggestions] = useState<SuggestedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestedMap, setRequestedMap] = useState<Record<string, boolean>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    connectionsApi.suggestions()
      .then((data) => {
        setSuggestions(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async (person: SuggestedPerson) => {
    setSubmittingMap((prev) => ({ ...prev, [person.id]: true }));
    try {
      await connectionsApi.request(person.id);
      setRequestedMap((prev) => ({ ...prev, [person.id]: true }));
    } catch (err: any) {
      alert(err.message || 'Connection request failed or already exists.');
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [person.id]: false }));
    }
  };

  const handleMessage = (person: SuggestedPerson) => {
    openChat({
      profileId: person.id,
      name: `${person.first_name} ${person.last_name}`.trim(),
      avatar: person.avatar_url,
      headline: person.headline,
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="space-y-3">
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <UserPlusIcon className="w-4 h-4 text-orange-500" />
          Connect with Alumni
        </h3>
        <span className="text-[10px] bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <SparklesIcon className="w-3 h-3" />
          Suggested
        </span>
      </div>

      <div className="space-y-3">
        {suggestions.slice(0, 4).map((person) => {
          const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Alumnus';
          const initials = (person.first_name?.[0] || 'A') + (person.last_name?.[0] || '');
          const isRequested = !!requestedMap[person.id];
          const isSubmitting = !!submittingMap[person.id];

          return (
            <div key={person.id} className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  {person.avatar_url ? (
                    <img
                      src={person.avatar_url}
                      alt={fullName}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {person.headline || 'CTU-Naga Alumnus'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Connect & Chat */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleMessage(person)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Message"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleConnect(person)}
                  disabled={isRequested || isSubmitting}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    isRequested
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs active:scale-95'
                  }`}
                >
                  {isRequested ? (
                    <>
                      <CheckIcon className="w-3 h-3 text-emerald-600" />
                      <span>Sent</span>
                    </>
                  ) : isSubmitting ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlusIcon className="w-3 h-3" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
        <button
          onClick={() => navigate('/network')}
          className="font-medium text-orange-600 hover:text-orange-700 hover:underline transition-colors"
        >
          Manage Network &rarr;
        </button>
        <button
          onClick={() => navigate('/directory')}
          className="text-gray-500 hover:text-gray-700 hover:underline transition-colors"
        >
          Find more
        </button>
      </div>
    </div>
  );
}
