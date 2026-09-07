import Link from 'next/link'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'

const sections = [
    { id: 'discover', title: 'Discover and verify events', text: 'Choose Discover events or Find a specific event, then review the editable conditions before starting a search. Strict matches satisfy required conditions with supporting evidence. Needs verification results have missing or conflicting information. Open field evidence to inspect sources and verification dates.', href: '/discover?view=discover', action: 'Find events' },
    { id: 'portfolio', title: 'Review before adding to Portfolio', text: 'Searching does not add events to your Portfolio. Select results and review the import details and duplicates before confirming. Starter tasks are optional; check the actual task count shown in the import confirmation before creating them.', href: '/discover?view=portfolio', action: 'Open Portfolio' },
    { id: 'tasks', title: 'Tasks and reminders', text: 'Open a task to manage its status, owner, dates and linked resources. Set a reminder on the task to receive an in-app reminder when Eventra is open. You can enable or disable these alerts in Notifications settings.', href: '/tasks', action: 'Open tasks' },
    { id: 'leads', title: 'Leads and follow-up', text: 'Use Leads to find contacts and open their detail pages. Review AI-generated summaries and email drafts before using them. Email templates support your follow-up preparation; generating a draft does not mean an email has been delivered.', href: '/leads', action: 'Open leads' },
    { id: 'team-access', title: 'Team access', text: 'An account must be added to the workspace team before it can access shared data. If you see a team-access notice, check the email you signed in with and ask the workspace owner to add that account. Changing your display name does not grant permissions.', href: '/settings/security', action: 'Security & access' },
    { id: 'search-recovery', title: 'Search warnings and recovery', text: 'Search history retains the job and its conditions. Reopen the search after leaving or refreshing the page. If sources fail, use Retry sources needing verification. A processing-limit warning means the search was bounded; narrow the criteria and search again. Unknown facts remain unverified.', href: '/discover?view=discover', action: 'Open search history' },
]

export default function HelpPage() {
    return <div className="eventra-workspace min-h-screen bg-background text-foreground"><TopNav /><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <header><p className="mb-2 text-sm text-muted-foreground">EVENTRA GUIDE</p><h1 className="text-2xl font-semibold">Help & getting started</h1><p className="mt-2 text-muted-foreground">Find events, check the evidence, and manage your team’s work.</p></header>
        <nav aria-label="Help topics" className="flex flex-wrap gap-2">{sections.map(section => <Link className="workspace-secondary" key={section.id} href={`#${section.id}`}>{section.title}</Link>)}</nav>
        <div className="grid gap-4 md:grid-cols-2">{sections.map(section => <section key={section.id} id={section.id} className="scroll-mt-36 space-y-3 rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">{section.title}</h2><p className="text-sm leading-6 text-muted-foreground">{section.text}</p><Button variant="outline" asChild><Link href={section.href}>{section.action}</Link></Button></section>)}</div>
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted p-6"><div><h2 className="font-semibold">Need more help?</h2><p className="mt-1 text-sm text-muted-foreground">Include the page and what you were trying to do when reporting a problem.</p></div><Button asChild><Link href="/contact">Contact & feedback</Link></Button></section>
    </main></div>
}
