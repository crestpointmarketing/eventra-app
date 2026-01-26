'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function TopNav() {
    const pathname = usePathname()

    const navItems = [
        { href: '/events', label: 'Events' },
        { href: '/leads', label: 'Leads' },
        { href: '/analytics', label: 'Analytics' },
        { href: '/settings', label: 'Settings' },
    ]

    return (
        <nav className="border-b border-zinc-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="text-2xl font-medium text-zinc-900">
                        Eventra
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex gap-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-base transition-colors ${pathname?.startsWith(item.href)
                                    ? 'text-zinc-900 font-medium'
                                    : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <Link href="/events/new">
                        <Button>+ New Event</Button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}
