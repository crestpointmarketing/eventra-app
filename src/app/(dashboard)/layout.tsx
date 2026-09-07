import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/top-nav'
import { NavigationControls } from '@/components/ui/navigation-controls'
import { TaskReminderNotifier } from '@/components/tasks/task-reminder-notifier'
import { TeamAccessNotice } from '@/components/auth/team-access-notice'

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
    if (error || !member) return <TeamAccessNotice email={user.email ?? 'Unknown account'} unavailable={!!error} />
    return (
        <div className="eventra-workspace min-h-screen bg-background text-foreground">
            <TopNav />
            <TaskReminderNotifier />
            <main className="min-w-0 bg-background">
                {children}
                <NavigationControls />
            </main>
        </div>
    )
}
