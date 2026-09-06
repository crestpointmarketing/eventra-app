import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/top-nav'
import { NavigationControls } from '@/components/ui/navigation-controls'
import { TaskReminderNotifier } from '@/components/tasks/task-reminder-notifier'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) redirect('/login')
    const { data: member, error } = await db.rpc('is_eventra_member')
    if (error || !member) return <main className="p-12">Team access is required. Please ask the workspace owner to add your account.</main>
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            <TopNav />
            <TaskReminderNotifier />
            <main className="bg-zinc-50 dark:bg-zinc-950">
                {children}
                <NavigationControls />
            </main>
        </div>
    )
}
