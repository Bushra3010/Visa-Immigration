/** Shown instantly while a CRM page loads its data. */
export default function CrmLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6 h-8 w-56 rounded-lg bg-slate-200" />
      <div className="mb-4 h-14 rounded-2xl border border-line bg-white" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl border border-line bg-white" />)}
      </div>
      <div className="space-y-px overflow-hidden rounded-2xl border border-line bg-white">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-4 w-1/4 rounded bg-slate-200" /><div className="h-4 w-1/5 rounded bg-slate-100" /><div className="h-4 w-1/6 rounded bg-slate-100" /><div className="ml-auto h-4 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
