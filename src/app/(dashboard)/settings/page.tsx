'use client'

import { PageTransition } from '@/components/animations/page-transition'
import { Card } from '@/components/ui/card'
import { Brain, User, Bell, Shield } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
    const settingsSections = [
        {
            title: 'Company Intelligence',
            description: "AI's long-term memory for contextual decision-making",
            icon: Brain,
            href: '/settings/company-intelligence',
            color: 'indigo',
            available: true
        },
        {
            title: 'Account Settings',
            description: 'Manage your profile and preferences',
            icon: User,
            href: '/settings/account',
            color: 'blue',
            available: true
        },
        {
            title: 'Notifications',
            description: 'Manage in-app task reminders on this browser',
            icon: Bell,
            href: '/settings/notifications',
            color: 'green',
            available: true
        },
        {
            title: 'Security & Access',
            description: 'Manage your password, session and team access',
            icon: Shield,
            href: '/settings/security',
            color: 'red',
            available: true
        }
    ]

    return (
        <PageTransition>
            <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-3">Settings</h1>
                <p className="text-zinc-600 dark:text-white/60 mb-8">
                    Manage your account settings and preferences
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {settingsSections.map((section) => {
                        const Icon = section.icon
                        const colorClasses = {
                            indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                            blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                            green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                            red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }

                        if (!section.available) {
                            return (
                                <Card
                                    key={section.title}
                                    className="p-6 border border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg ${colorClasses[section.color as keyof typeof colorClasses]}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                                                {section.title}
                                            </h2>
                                            <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                                                {section.description}
                                            </p>
                                            <p className="text-sm text-zinc-500 dark:text-zinc-500">
                                                Coming soon...
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )
                        }

                        return (
                            <Link key={section.title} href={section.href}>
                                <Card className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer hover:border-zinc-300">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg ${colorClasses[section.color as keyof typeof colorClasses]}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                                                {section.title}
                                            </h2>
                                            <p className="text-zinc-600 dark:text-zinc-400">
                                                {section.description}
                                            </p>
                                        </div>
                                        <svg
                                            className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </PageTransition>
    )
}
