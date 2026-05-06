export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-steel">This module is queued in the roadmap after the auth foundation.</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-steel">
        This placeholder is no longer used. All modules have been implemented.
      </section>
    </div>
  );
}
