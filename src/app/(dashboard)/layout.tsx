import { TopNav } from '@/components/layout/top-nav'
import { NavigationControls } from '@/components/ui/navigation-controls'
import { TaskReminderNotifier } from '@/components/tasks/task-reminder-notifier'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
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
