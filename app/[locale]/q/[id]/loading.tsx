export default function QuoteLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-12 w-12 rounded-lg bg-slate-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Hero skeleton */}
        <div className="text-center mb-16 space-y-4">
          <div className="h-10 w-3/4 mx-auto bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-1/2 mx-auto bg-slate-100 rounded animate-pulse" />
          <div className="h-16 w-48 mx-auto bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
