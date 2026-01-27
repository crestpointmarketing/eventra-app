import { TopNav } from '@/components/layout/top-nav'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            <TopNav />
            <main className="bg-zinc-50 dark:bg-zinc-950">{children}</main>
        </div>
    )
}
