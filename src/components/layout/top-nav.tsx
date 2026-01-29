'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Input } from '@/components/ui/input'
import {
    Search, MessageSquare, Bell, Map, User, LogOut,
    Settings, LayoutDashboard
} from 'lucide-react'

export function TopNav() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState<any>(null)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)

    // Check authentication status
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        checkUser()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
        }
    }

    const navItems = [
        { href: '/events', label: 'Events' },
        { href: '/tasks', label: 'Tasks' },
        { href: '/assets', label: 'Assets' },
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
                        <img
                            src="/eventra-logo-light.png"
                            alt="Eventra - Leads to Revenue"
                            className="h-14 w-auto dark:hidden"
                        />
                        <img
                            src="/eventra-logo-dark.png"
                            alt="Eventra - Leads to Revenue"
                            className="h-14 w-auto hidden dark:block"
                        />
                    </Link>

                    {/* Navigation Links - Only show when logged in */}
                    {user && (
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
                    )}

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            // Authenticated user controls
                            <>
                                {/* Search */}
                                <form onSubmit={handleSearch} className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        type="text"
                                        placeholder="Find..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-10 w-48 h-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                    />
                                    <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded">
                                        F
                                    </kbd>
                                </form>

                                {/* Feedback Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-zinc-700 dark:text-zinc-300"
                                >
                                    Feedback
                                </Button>

                                {/* Notifications */}
                                <button
                                    className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                                    {/* Notification badge */}
                                    <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-600 rounded-full"></span>
                                </button>

                                {/* Map Icon */}
                                <button
                                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    aria-label="Map View"
                                >
                                    <Map className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                                </button>

                                {/* User Avatar & Dropdown */}
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
                                        aria-label="User menu"
                                    >
                                        {user.email?.[0].toUpperCase() || 'U'}
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                                            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                    {user.email}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    Free Plan
                                                </p>
                                            </div>
                                            <Link
                                                href="/dashboard"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <LayoutDashboard className="h-4 w-4" />
                                                Dashboard
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                onClick={() => setShowUserMenu(false)}
                                            >
                                                <Settings className="h-4 w-4" />
                                                Settings
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            // Unauthenticated user controls
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">
                                        Log In
                                    </Button>
                                </Link>
                                <Link href="/contact">
                                    <Button variant="ghost" size="sm">
                                        Contact
                                    </Button>
                                </Link>
                                <Link href="/login">
                                    <Button size="sm">
                                        Sign Up
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}
