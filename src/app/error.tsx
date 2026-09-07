'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ error, retry }: { error: (Error & { digest?: string }) | null; retry: () => void }) {
    return <main className="eventra-workspace mx-auto my-12 max-w-xl space-y-5 rounded-xl border border-border bg-card p-6 text-foreground"><p className="text-sm text-muted-foreground">EVENTRA</p><h1 className="text-2xl font-semibold">This page could not load</h1><p className="text-muted-foreground">Try loading the page again. If you were saving a record, check whether it was saved before submitting it again.</p>{error?.digest && <p className="break-all text-xs text-muted-foreground">Reference: {error.digest}</p>}<div className="flex flex-wrap gap-2"><Button onClick={() => retry()}>Try again</Button><Button variant="outline" asChild><Link href="/dashboard">Open workspace</Link></Button><Button variant="outline" asChild><Link href="/help">Get help</Link></Button></div></main>
}
