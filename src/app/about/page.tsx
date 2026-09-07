import Link from 'next/link'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
    return <div className="eventra-workspace min-h-screen bg-background text-foreground"><TopNav /><main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6"><header className="space-y-3"><p className="text-sm text-muted-foreground">ABOUT EVENTRA</p><h1 className="text-2xl font-semibold">From event discovery to team follow-up</h1><p className="text-muted-foreground">Eventra brings event research, your event portfolio, leads and tasks into one workspace.</p></header><div className="grid gap-4 sm:grid-cols-2">{[
        ['Discover with evidence', 'Search with editable conditions and inspect the sources behind event details. Unknown or conflicting information remains visible for review.'],
        ['Build your Portfolio', 'Choose which events to add, check duplicates and decide whether to create starter tasks.'],
        ['Coordinate your team', 'Track event preparation, task ownership, assets and leads using shared workspace records.'],
        ['Prepare follow-up', 'Use company context and email templates to prepare drafts. Review AI suggestions before acting on them.'],
    ].map(([title, text]) => <section key={title} className="space-y-3 rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">{title}</h2><p className="text-sm leading-6 text-muted-foreground">{text}</p></section>)}</div><div className="flex flex-wrap gap-3"><Button asChild><Link href="/dashboard">Open workspace</Link></Button><Button variant="outline" asChild><Link href="/help">Read the guide</Link></Button><Button variant="outline" asChild><Link href="/contact">Contact</Link></Button></div></main></div>
}
