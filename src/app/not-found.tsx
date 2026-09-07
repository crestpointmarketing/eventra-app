import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return <main className="eventra-workspace flex min-h-screen items-center justify-center bg-background px-4 text-foreground"><section className="w-full max-w-lg space-y-5 rounded-xl border border-border bg-card p-6 sm:p-8"><p className="text-sm text-muted-foreground">EVENTRA · 404</p><h1 className="text-2xl font-semibold">Page not found</h1><p className="text-muted-foreground">This link may be incorrect, or the page may have moved. Choose where to continue.</p><div className="flex flex-wrap gap-2"><Button asChild><Link href="/dashboard">Open workspace</Link></Button><Button variant="outline" asChild><Link href="/help">Help & getting started</Link></Button></div></section></main>
}
