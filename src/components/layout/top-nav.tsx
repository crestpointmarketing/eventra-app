'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function TopNav() {
    const pathname = usePathname()

    const navItems = [
        { href: '/events', label: 'Events' },
        { href: '/leads', label: 'Leads' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/settings', label: 'Settings' },
    ]

    return (
        <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        {/* Light mode logo (black text) */}
                        <img
                            src="/eventra-logo-light.png"
                            alt="Eventra - Leads to Revenue"
                            className="h-14 w-auto dark:hidden"
                        />
                        {/* Dark mode logo (white text) */}
                        <img
                            src="/eventra-logo-dark.png"
                            alt="Eventra - Leads to Revenue"
                            className="h-14 w-auto hidden dark:block"
                        />
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex gap-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-base transition-colors ${pathname?.startsWith(item.href)
                                    ? 'text-zinc-900 dark:text-white font-medium'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link href="/events/new">
                            <Button>+ New Event</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
