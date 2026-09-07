export default function Loading() {
    return <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6" role="status" aria-live="polite"><p className="text-sm text-muted-foreground">Loading workspace…</p><div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse"><div className="h-8 w-48 rounded-lg bg-muted" /><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-28 rounded-xl border border-border bg-muted" />)}</div><div className="h-64 rounded-xl border border-border bg-muted" /></div></div>
}
