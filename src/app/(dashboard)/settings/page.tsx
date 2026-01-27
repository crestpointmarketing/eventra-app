'use client'

import { PageTransition } from '@/components/animations/page-transition'

export default function SettingsPage() {
    return (
        <PageTransition>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-5xl font-medium text-zinc-900 dark:text-white mb-8">Settings</h1>

                <div className="space-y-6">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-8">
                        <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-4">Account Settings</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">Settings functionality coming soon...</p>
                    </div>
                </div>
            </div>
        </PageTransition>
    )
}
