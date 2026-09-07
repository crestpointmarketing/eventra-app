'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SettingsShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    const pathname = usePathname()
    return <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">← Settings</Link>
        <header><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></header>
        <nav aria-label="Personal settings" className="flex flex-wrap gap-2">
            {[
                ['/settings/account', 'Account'],
                ['/settings/notifications', 'Notifications'],
                ['/settings/security', 'Security & access'],
            ].map(([href, label]) => <Link key={href} aria-current={pathname === href ? 'page' : undefined} className={pathname === href ? 'workspace-action' : 'workspace-secondary'} href={href}>{label}</Link>)}
        </nav>
        {children}
    </div>
}
