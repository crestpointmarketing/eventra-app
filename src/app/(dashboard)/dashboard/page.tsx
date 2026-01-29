'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Calendar, Users, DollarSign, ArrowRight, Plus,
    AlertTriangle, Info
} from 'lucide-react'

// Mock data
const mockStats = {
    activeEvents: 4,
    leadsCount: 128,
    meetingsScheduled: 12,
    pipeline: 1200000,
}

const mockEvents = [
    {
        id: '1',
        name: 'TechSummit 2024',
        category: 'Enterprise Software',
        date: 'Oct 12-14',
        location: 'San Francisco',
        status: 'active' as const,
        completion: 75,
    },
    {
        id: '2',
        name: 'Global Innovators',
        category: 'Strategy & Ops',
        date: 'Nov 05',
        location: 'London',
        status: 'planning' as const,
        completion: 40,
    },
    {
        id: '3',
        name: 'Future FinTech',
        category: 'Finance',
        date: 'Dec 10-12',
        location: 'New York',
        status: 'prep' as const,
        completion: 15,
    },
    {
        id: '4',
        name: 'AI Summit West',
        category: 'Technology',
        date: 'Jan 15',
        location: 'Seattle',
        status: 'draft' as const,
        completion: 5,
    },
]

const mockTodos = [
    {
        id: '1',
        title: 'Finalize booth design',
        eventName: 'TechSummit 2024',
        dueDate: 'Due Tomorrow',
        completed: false,
    },
    {
        id: '2',
        title: 'Send speaker intro emails',
        eventName: 'Global Innovators',
        dueDate: 'Due Friday',
        completed: false,
    },
    {
        id: '3',
        title: 'Review catering menu options',
        eventName: 'TechSummit 2024',
        dueDate: 'Overdue',
        completed: false,
    },
]

const mockNotes = [
    {
        id: '1',
        type: 'warning' as const,
        title: 'Vendor Delay Risk',
        description: 'Audio visual supplier for the London event is reporting a potential delay in equipment shipping. Need to follow up by EOD Thursday.',
    },
    {
        id: '2',
        type: 'info' as const,
        title: 'Budget Update',
        description: 'Q4 budget approval pending finance review. Hold off on "Future FinTech" large purchase orders.',
    },
]

// Status badge component
function StatusBadge({ status }: { status: 'active' | 'planning' | 'prep' | 'draft' }) {
    const styles = {
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        prep: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        draft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300',
    }

    const labels = {
        active: 'Active',
        planning: 'Planning',
        prep: 'Prep',
        draft: 'Draft',
    }

    return (
        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    )
}

// Stat card component
function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
    return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs uppercase text-zinc-500 dark:text-zinc-400 tracking-wide">
                    {label}
                </span>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                {value}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [stats, setStats] = useState(mockStats)
    const [events, setEvents] = useState(mockEvents)
    const [todos, setTodos] = useState(mockTodos)
    const [notes, setNotes] = useState(mockNotes)

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
            notation: 'compact',
        }).format(amount)
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-xs text-zinc-500 uppercase mb-6">
                    <span>Workspace</span>
                    <span>›</span>
                    <span className="text-zinc-900 dark:text-white font-medium">Dashboard</span>
                </nav>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                        Dashboard
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Overview of active events and follow-up progress.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={Calendar}
                        label="Active Events"
                        value={stats.activeEvents}
                    />
                    <StatCard
                        icon={Users}
                        label="Leads Captured"
                        value={stats.leadsCount}
                    />
                    <StatCard
                        icon={Calendar}
                        label="Meetings Scheduled"
                        value={stats.meetingsScheduled}
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Est. Pipeline"
                        value={formatCurrency(stats.pipeline)}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Current Events (2/3 width) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    Current Events
                                </h2>
                                <Link href="/events" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1">
                                    View all <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Event Name</th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Date</th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Location</th>
                                            <th className="text-left p-4 text-xs uppercase text-zinc-500 font-medium">Status</th>
                                            <th className="text-right p-4 text-xs uppercase text-zinc-500 font-medium">Completion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((event) => (
                                            <tr key={event.id} className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-zinc-900 dark:text-white">
                                                        {event.name}
                                                    </div>
                                                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                                        {event.category}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{event.date}</td>
                                                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{event.location}</td>
                                                <td className="p-4">
                                                    <StatusBadge status={event.status} />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[#CBFB45] rounded-full transition-all"
                                                                style={{ width: `${event.completion}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-zinc-600 dark:text-zinc-400 w-10 text-right">
                                                            {event.completion}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Widgets (1/3 width) */}
                    <div className="space-y-6">
                        {/* This Week Widget */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">This Week</h3>
                                <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                {todos.map((todo) => (
                                    <div key={todo.id} className="flex items-start gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-lg transition-colors">
                                        <input
                                            type="radio"
                                            className="mt-1 h-4 w-4 border-zinc-300 dark:border-zinc-600"
                                            checked={todo.completed}
                                            readOnly
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {todo.title}
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                {todo.eventName} • {todo.dueDate}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes & Risks Widget */}
                        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                            <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Notes & Risks</h3>
                            </div>

                            <div className="p-4 space-y-3">
                                {notes.map((note) => {
                                    const isWarning = note.type === 'warning'
                                    const Icon = isWarning ? AlertTriangle : Info
                                    const styles = isWarning ? {
                                        bg: 'bg-orange-50 dark:bg-orange-950/20',
                                        border: 'border-orange-200 dark:border-orange-800/50',
                                        iconBg: 'bg-orange-100 dark:bg-orange-900/50',
                                        iconColor: 'text-orange-600 dark:text-orange-400',
                                        title: 'text-orange-900 dark:text-orange-200',
                                        text: 'text-orange-700 dark:text-orange-300',
                                    } : {
                                        bg: 'bg-blue-50 dark:bg-blue-950/20',
                                        border: 'border-blue-200 dark:border-blue-800/50',
                                        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
                                        iconColor: 'text-blue-600 dark:text-blue-400',
                                        title: 'text-blue-900 dark:text-blue-200',
                                        text: 'text-blue-700 dark:text-blue-300',
                                    }

                                    return (
                                        <div key={note.id} className={`flex gap-3 p-4 ${styles.bg} border ${styles.border} rounded-lg`}>
                                            <div className="flex-shrink-0">
                                                <div className={`h-8 w-8 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                                                    <Icon className={`h-4 w-4 ${styles.iconColor}`} />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className={`text-sm font-medium ${styles.title} mb-1`}>
                                                    {note.title}
                                                </div>
                                                <div className={`text-xs ${styles.text}`}>
                                                    {note.description}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
