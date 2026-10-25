'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import {
    BarChart3,
    Bell,
    ChevronDown,
    ClipboardCheck,
    FolderOpen,
    HelpCircle,
    LayoutDashboard,
    ListChecks,
    LogOut,
    Mail,
    Menu,
    MessageSquare,
    Search,
    Settings,
    CalendarRange,
    Users,
    type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeGetUser } from '@/lib/supabase/auth'
import { useTasks } from '@/hooks/useTasks'
import { localDateKey } from '@/lib/date-only'
import { ThemeToggle } from '@/components/theme-toggle'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

interface NavItem {
    label: string
    href: string
    icon: LucideIcon
    /** Paths that mark the item active; a `?view=` suffix also compares the EventPulse view. */
    match: string[]
}

const MAIN_NAV: NavItem[] = [
    { label: 'Discover', href: '/discover?view=discover', icon: Search, match: ['/discover?view=discover'] },
    { label: 'My Events', href: '/discover?view=portfolio', icon: CalendarRange, match: ['/discover?view=portfolio', '/discover?view=insights', '/events'] },
    { label: 'Review', href: '/discover?view=review', icon: ClipboardCheck, match: ['/discover?view=review'] },
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, match: ['/dashboard'] },
    { label: 'Leads', href: '/leads', icon: Users, match: ['/leads'] },
    { label: 'Tasks', href: '/tasks', icon: ListChecks, match: ['/tasks'] },
    { label: 'Email Templates', href: '/email-templates', icon: Mail, match: ['/email-templates'] },
    { label: 'Assets', href: '/assets', icon: FolderOpen, match: ['/assets'] },
    { label: 'Reports', href: '/analytics', icon: BarChart3, match: ['/analytics'] },
]
const FOOTER_NAV: NavItem[] = [
    { label: 'Settings', href: '/settings', icon: Settings, match: ['/settings'] },
    { label: 'Help & Support', href: '/help', icon: HelpCircle, match: ['/help', '/contact'] },
]
const PAGE_TITLES: [string, string][] = [
    ['/discover?view=discover', 'Discover events'],
    ['/discover?view=review', 'Review queue'],
    ['/discover?view=insights', 'Insights'],
    ['/discover', 'My Events'],
    ['/events/new', 'Add event'],
    ['/events', 'Event'],
    ['/dashboard', 'Overview'],
    ['/leads', 'Leads'],
    ['/tasks', 'Tasks'],
    ['/email-templates', 'Email Templates'],
    ['/assets', 'Asset Library'],
    ['/analytics', 'Reports'],
    ['/settings', 'Settings'],
    ['/ai-demo', 'AI demo'],
]

function useLocationKey() {
    const pathname = usePathname() ?? ''
    const params = useSearchParams()
    const view = pathname === '/discover' ? (params.get('view') ?? 'portfolio') : null
    return { pathname, view }
}
function matches({ pathname, view }: ReturnType<typeof useLocationKey>, pattern: string) {
    const [path, query] = pattern.split('?view=')
    if (query) return pathname === path && view === query
    return pathname === path || pathname.startsWith(path + '/')
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
    const location = useLocationKey()
    return (
        <ul className="space-y-1">
            {items.map((item) => {
                const active = item.match.some((pattern) => matches(location, pattern))
                const Icon = item.icon
                return (
                    <li key={item.label}>
                        <Link
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-white/10 font-semibold text-white' : 'font-medium text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                            {item.label}
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}

function displayName(user: SupabaseUser | null) {
    const name = user?.user_metadata?.full_name
    return typeof name === 'string' && name.trim() ? name.trim() : (user?.email ?? 'Account')
}
function initials(user: SupabaseUser | null) {
    const parts = displayName(user).replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? 'U').slice(0, 2)).toUpperCase()
}

function AccountMenu({ user, onSignOut, compact }: { user: SupabaseUser | null; onSignOut: () => void; compact?: boolean }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Account menu"
                    className={`flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors hover:bg-white/5 ${compact ? 'p-1' : 'w-full px-2 py-2'}`}
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
                        {initials(user)}
                    </span>
                    {!compact && (
                        <>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-white">{displayName(user)}</span>
                                <span className="block truncate text-xs text-slate-400">{user?.email}</span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        </>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'top'} className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/settings/account"><Settings className="h-4 w-4" />Account settings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/contact"><MessageSquare className="h-4 w-4" />Feedback</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onSignOut} className="text-red-600 focus:text-red-600 dark:text-red-400">
                    <LogOut className="h-4 w-4" />Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/** Open tasks assigned to the signed-in user that are overdue or due today. */
function TaskAlerts({ userId }: { userId: string | undefined }) {
    const { data: tasks, isError } = useTasks()
    const today = localDateKey(new Date())
    const due = (tasks ?? [])
        .filter((task) => task.assigned_to === userId && task.due_date && task.due_date.slice(0, 10) <= today && task.status !== 'done' && task.status !== 'archived')
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" aria-label={due.length ? `${due.length} tasks due` : 'Task alerts'} className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    {due.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>My tasks due</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isError && <p className="px-2 py-3 text-sm text-muted-foreground">Tasks could not be loaded.</p>}
                {!isError && !due.length && <p className="px-2 py-3 text-sm text-muted-foreground">Nothing overdue or due today.</p>}
                {due.slice(0, 8).map((task) => (
                    <DropdownMenuItem key={task.id} asChild>
                        <Link href={`/tasks/${task.id}`} className="flex flex-col items-start gap-0.5">
                            <span className="line-clamp-1 text-sm font-medium">{task.title}</span>
                            <span className={`text-xs ${task.due_date!.slice(0, 10) < today ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                {task.due_date!.slice(0, 10) < today ? 'Overdue' : 'Due today'} · {task.due_date!.slice(0, 10)}
                            </span>
                        </Link>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/tasks">View all tasks</Link></DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function PageTitle() {
    const location = useLocationKey()
    const title = PAGE_TITLES.find(([pattern]) => matches(location, pattern))?.[1] ?? 'Eventra'
    return <p className="truncate text-lg font-semibold text-foreground">{title}</p>
}

function SidebarContent({ user, onSignOut, onNavigate }: { user: SupabaseUser | null; onSignOut: () => void; onNavigate?: () => void }) {
    return (
        <div className="flex h-full flex-col bg-[#111827] text-white">
            <Link href="/dashboard" onClick={onNavigate} className="flex h-16 shrink-0 items-center px-5">
                <img src="/eventra-logo-dark.png" alt="Eventra" className="h-9 w-auto" />
            </Link>
            <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                <NavLinks items={MAIN_NAV} onNavigate={onNavigate} />
            </nav>
            <div className="shrink-0 border-t border-white/10 px-3 py-3">
                <NavLinks items={FOOTER_NAV} onNavigate={onNavigate} />
            </div>
            <div className="shrink-0 border-t border-white/10 px-3 py-3">
                <AccountMenu user={user} onSignOut={onSignOut} />
            </div>
        </div>
    )
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = useMemo(() => createClient(), [])
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        void safeGetUser(supabase).then(setUser)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
        return () => subscription.unsubscribe()
    }, [supabase])
    useEffect(() => setMobileOpen(false), [pathname])

    const signOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen lg:pl-56">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 lg:block">
                <Suspense fallback={null}><SidebarContent user={user} onSignOut={signOut} /></Suspense>
            </aside>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-64 border-none p-0 [&>button]:text-white [&>button]:ring-offset-[#111827] [&>button]:data-[state=open]:bg-transparent">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <Suspense fallback={null}><SidebarContent user={user} onSignOut={signOut} onNavigate={() => setMobileOpen(false)} /></Suspense>
                </SheetContent>
            </Sheet>
            <header className="eventra-top-nav sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
                <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                    <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1"><Suspense fallback={null}><PageTitle /></Suspense></div>
                <TaskAlerts userId={user?.id} />
                <ThemeToggle />
                <span className="hidden text-sm font-medium text-foreground sm:inline">Eventra team</span>
                <div className="lg:hidden">
                    <AccountMenu user={user} onSignOut={signOut} compact />
                </div>
            </header>
            {children}
        </div>
    )
}
