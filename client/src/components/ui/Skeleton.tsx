export function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
      <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
      <div className="h-3 w-12 bg-gray-200 animate-pulse rounded ml-auto" />
    </div>
    <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded mb-2" />
    <div className="h-3 w-full bg-gray-200 animate-pulse rounded mb-1" />
    <div className="h-3 w-5/6 bg-gray-200 animate-pulse rounded mb-1" />
    <div className="h-3 w-2/3 bg-gray-200 animate-pulse rounded mb-3" />
    <div className="h-32 w-full bg-gray-200 animate-pulse rounded mb-3" />
    <div className="flex gap-4">
      <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
      <div className="h-3 w-14 bg-gray-200 animate-pulse rounded" />
      <div className="h-3 w-12 bg-gray-200 animate-pulse rounded" />
    </div>
  </div>;
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return <div className={`flex items-center gap-3 p-3 ${className}`}>
    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-3/5 bg-gray-200 animate-pulse rounded" />
      <div className="h-2.5 w-2/5 bg-gray-200 animate-pulse rounded" />
    </div>
    <div className="h-3 w-12 bg-gray-200 animate-pulse rounded" />
  </div>;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-3 bg-gray-200 animate-pulse rounded"
        style={{ width: `${85 - i * 10}%` }}
      />
    ))}
  </div>;
}

export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
    <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-2" />
    <div className="h-6 w-10 bg-gray-200 animate-pulse rounded" />
  </div>;
}

export function SkeletonEventItem({ className = '' }: { className?: string }) {
  return <div className={`flex items-start gap-3 ${className}`}>
    <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" />
      <div className="h-2.5 w-1/2 bg-gray-200 animate-pulse rounded" />
    </div>
  </div>;
}

export function SkeletonActivityItem({ className = '' }: { className?: string }) {
  return <div className={`flex items-start gap-2 ${className}`}>
    <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse mt-1.5 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-4/5 bg-gray-200 animate-pulse rounded" />
      <div className="h-2.5 w-16 bg-gray-200 animate-pulse rounded" />
    </div>
  </div>;
}
