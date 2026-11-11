export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-2xs animate-pulse ${className}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-32 bg-gray-200 rounded" />
          <div className="h-2.5 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full ml-auto" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="space-y-1.5 mb-3">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-5/6 bg-gray-100 rounded" />
        <div className="h-3 w-2/3 bg-gray-100 rounded" />
      </div>
      <div className="h-36 w-full bg-gray-100 rounded-lg mb-3" />
      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="h-4 w-16 bg-gray-100 rounded" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
        </div>
        <div className="flex -space-x-1">
          <div className="w-5 h-5 rounded-full bg-gray-200 ring-1 ring-white" />
          <div className="w-5 h-5 rounded-full bg-gray-100 ring-1 ring-white" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 animate-pulse ${className}`}>
      <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/5 bg-gray-200 rounded" />
        <div className="h-2.5 w-2/5 bg-gray-100 rounded" />
      </div>
      <div className="h-6 w-14 bg-gray-100 rounded-lg" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-200 rounded"
          style={{ width: `${Math.max(40, 88 - i * 11)}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between animate-pulse ${className}`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-100" />
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-6 w-20 bg-gray-200 rounded" />
          <div className="h-3.5 w-28 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-gray-100">
        <div className="h-2.5 w-32 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function SkeletonEventItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 animate-pulse ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-2.5 w-1/2 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function SkeletonActivityItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 animate-pulse ${className}`}>
      <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-4/5 bg-gray-200 rounded" />
        <div className="h-2.5 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function SkeletonSuggestionItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 py-2 animate-pulse ${className}`}>
      <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3 w-28 bg-gray-200 rounded" />
        <div className="h-2.5 w-20 bg-gray-100 rounded" />
      </div>
      <div className="h-6 w-16 bg-gray-100 rounded-full shrink-0" />
    </div>
  );
}

export function SkeletonCommentList({ count = 3, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-start gap-2.5">
            <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-gray-200 shrink-0`} />
            <div className="flex-1 space-y-1.5">
              <div className="bg-white border border-gray-200/70 rounded-2xl p-2.5 space-y-1.5 max-w-[85%]">
                <div className="flex items-center justify-between gap-4">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-2.5 w-10 bg-gray-100 rounded" />
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded" />
                <div className="h-2.5 w-2/3 bg-gray-100 rounded" />
              </div>
              <div className="flex items-center gap-3 px-2">
                <div className="h-2.5 w-12 bg-gray-200 rounded" />
                <div className="h-2.5 w-8 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
          {idx === 0 && (
            <div className="ml-5 sm:ml-9 pl-3 border-l-2 border-gray-200 flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 bg-white border border-gray-200/70 rounded-xl p-2 space-y-1 max-w-[75%]">
                <div className="h-2.5 w-20 bg-gray-200 rounded" />
                <div className="h-2.5 w-5/6 bg-gray-100 rounded" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SkeletonReactionUserList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 animate-pulse py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-1.5 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="w-3.5 h-3.5 rounded-full bg-gray-100 ring-1 ring-white absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-2.5 w-44 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDirectoryCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs animate-pulse ${className}`}>
      <div className="h-14 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
      <div className="px-4 pb-4 -mt-7">
        <div className="w-14 h-14 rounded-full bg-gray-200 border-2 border-white mx-auto mb-2.5" />
        <div className="space-y-1.5 text-center mb-3">
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto" />
          <div className="h-3 w-24 bg-gray-100 rounded mx-auto" />
          <div className="h-3 w-40 bg-gray-100 rounded mx-auto" />
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <div className="h-8 flex-1 bg-gray-100 rounded-lg" />
          <div className="h-8 flex-1 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonJobCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-2xs animate-pulse ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 bg-gray-200 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-5 w-20 bg-gray-100 rounded-full shrink-0" />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="h-5 w-20 bg-gray-100 rounded-md" />
        <div className="h-5 w-24 bg-gray-100 rounded-md" />
        <div className="h-5 w-16 bg-gray-100 rounded-md" />
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-4/5 bg-gray-100 rounded" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-100 rounded-lg" />
          <div className="h-8 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonEventCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs animate-pulse ${className}`}>
      <div className="h-36 bg-gray-200 relative">
        <div className="absolute top-3 right-3 w-11 h-12 rounded-lg bg-white/80" />
        <div className="absolute top-3 left-3 w-16 h-5 rounded-full bg-white/70" />
      </div>
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-4/5 bg-gray-200 rounded" />
        <div className="space-y-1.5">
          <div className="h-3 w-40 bg-gray-100 rounded" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-7 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonAnnouncementCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-2xs animate-pulse ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
      <div className="space-y-1.5 mb-3">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-11/12 bg-gray-100 rounded" />
        <div className="h-3 w-3/5 bg-gray-100 rounded" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonForumPostCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3 animate-pulse ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-gray-200 rounded" />
            <div className="h-2.5 w-24 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-4/5 bg-gray-100 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="h-6 w-14 bg-gray-100 rounded-lg" />
          <div className="h-6 w-20 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export function SkeletonProfilePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
      {/* Banner + Avatar Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
        <div className="px-5 pb-5 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-gray-200 border-4 border-white shrink-0" />
              <div className="pb-1 space-y-2">
                <div className="h-5 w-44 bg-gray-200 rounded" />
                <div className="h-3.5 w-60 bg-gray-100 rounded" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-gray-100 rounded-full" />
                  <div className="h-5 w-24 bg-gray-100 rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-gray-200 rounded-lg" />
              <div className="h-9 w-24 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-2.5 w-full bg-gray-100 rounded-full" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-5/6 bg-gray-100 rounded" />
              <div className="h-3 w-3/4 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-16 bg-gray-100 rounded-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-36 bg-gray-200 rounded" />
              <div className="h-6 w-16 bg-gray-100 rounded" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 pt-2">
                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-44 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-2.5 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function SkeletonChartPanel({ className = '', heightClass = 'h-56' }: { className?: string; heightClass?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-2xs animate-pulse ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="space-y-1.5">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-lg" />
      </div>
      <div className={`${heightClass} flex items-end justify-around gap-3 px-4 pt-6 pb-2 bg-gray-50/70 rounded-lg border border-gray-100`}>
        {[45, 78, 62, 90, 52, 70, 40].map((h, i) => (
          <div
            key={i}
            className="flex-1 max-w-[36px] bg-gray-200/80 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="h-3 w-16 bg-gray-100 rounded-full" />
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
        <div className="h-3 w-14 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonTableRows({
  rows = 6,
  cols = 6,
  withAvatar = true,
}: {
  rows?: number;
  cols?: number;
  withAvatar?: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="animate-pulse border-b border-gray-100">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3.5">
              {c === 0 && withAvatar ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 bg-gray-200 rounded" />
                    <div className="h-2.5 w-36 bg-gray-100 rounded" />
                  </div>
                </div>
              ) : c === cols - 1 ? (
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                  <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                </div>
              ) : (
                <div className="space-y-1">
                  <div
                    className="h-3.5 bg-gray-200/80 rounded"
                    style={{ width: `${65 + ((r + c) % 3) * 15}px` }}
                  />
                  {c === 1 && <div className="h-2.5 w-16 bg-gray-100 rounded" />}
                </div>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonNotificationRow({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-44 bg-gray-200 rounded" />
              <div className="h-2.5 w-14 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-3/4 bg-gray-100 rounded" />
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1.5 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSurveyCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3 animate-pulse ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-2/3 bg-gray-100 rounded" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between">
          <div className="h-2.5 w-20 bg-gray-100 rounded" />
          <div className="h-2.5 w-10 bg-gray-200 rounded" />
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full" />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <div className="h-8 w-20 bg-gray-100 rounded-lg" />
        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonSurveyForm() {
  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <div className="h-5 w-24 bg-orange-100 rounded-full" />
        <div className="h-6 w-2/3 bg-gray-200 rounded" />
        <div className="h-3.5 w-full bg-gray-100 rounded" />
        <div className="h-2 w-full bg-gray-100 rounded-full mt-2" />
      </div>
      {[1, 2, 3].map((q) => (
        <div key={q} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((o) => (
              <div key={o} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100">
                <div className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChatMessages({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 p-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => {
        const isMine = i % 2 === 1;
        return (
          <div key={i} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {!isMine && <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />}
            <div
              className={`rounded-2xl px-3 py-2 space-y-1 ${
                isMine ? 'bg-orange-100/80 w-44' : 'bg-gray-100 w-52'
              }`}
            >
              <div className="h-2.5 w-full bg-gray-200/70 rounded" />
              <div className="h-2.5 w-2/3 bg-gray-200/60 rounded" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SkeletonModalDetail() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-44 bg-gray-200 rounded" />
          <div className="h-3 w-60 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="h-2.5 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3.5 w-32 bg-gray-200 rounded" />
        <div className="h-20 w-full bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonAuditKpi({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs animate-pulse ${className}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-4 h-4 rounded bg-gray-200" />
        <div className="h-3 w-28 bg-gray-200 rounded" />
      </div>
      <div className="h-7 w-20 bg-gray-200 rounded mb-1.5" />
      <div className="h-2.5 w-32 bg-gray-100 rounded" />
    </div>
  );
}

export function SkeletonAuditTableRow({ className = '' }: { className?: string }) {
  return (
    <tr className={`animate-pulse ${className}`}>
      {/* Timestamp */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="h-3.5 w-16 bg-gray-200 rounded mb-1.5" />
        <div className="h-2.5 w-24 bg-gray-100 rounded" />
      </td>

      {/* Severity & Status */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
          <div className="h-4 w-8 bg-gray-100 rounded" />
        </div>
      </td>

      {/* Event Action */}
      <td className="px-3 py-3.5">
        <div className="h-3.5 w-28 bg-gray-200 rounded mb-1" />
        <div className="h-2.5 w-40 bg-gray-100 rounded" />
      </td>

      {/* Actor */}
      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-2.5 w-12 bg-gray-100 rounded" />
          </div>
        </div>
      </td>

      {/* Entity */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <div className="h-3.5 w-16 bg-gray-200 rounded mb-1" />
        <div className="h-2.5 w-20 bg-gray-100 rounded" />
      </td>

      {/* Origin IP */}
      <td className="px-3 py-3.5 whitespace-nowrap">
        <div className="h-5 w-20 bg-gray-100 rounded border border-gray-100" />
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <div className="inline-block h-6 w-16 bg-gray-100 rounded-md" />
      </td>
    </tr>
  );
}
