'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mail, Phone, Calendar, CheckCircle2, MessageSquare, Bot, ArrowRight, User } from 'lucide-react'
import { format } from 'date-fns'

interface ActivityTimelineProps {
    lead: any
}

// Mock Activity Data
const activities = [
    {
        id: 1,
        type: 'email',
        title: 'Proposal Sent: Enterprise Licensing',
        description: 'Sent the updated Q3 proposal with custom pricing tier as discussed.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        user: 'You',
        icon: Mail,
        color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
    },
    {
        id: 2,
        type: 'ai_insight',
        title: 'High Intent Signal Detected',
        description: 'Lead visited "API Documentation" and "Enterprise Security" pages 3x today.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
        user: 'Eventra AI',
        icon: Bot,
        color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
    },
    {
        id: 3,
        type: 'call',
        title: 'Discovery Call',
        description: 'Discussed requirements for Single Sign-On (SSO) and role-based access control.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        user: 'Sarah Miller',
        icon: Phone,
        color: 'text-green-500 bg-green-50 dark:bg-green-900/20'
    },
    {
        id: 4,
        type: 'meeting',
        title: 'Webinar Attendance: "Scaling Events"',
        description: 'Attended full 45-min session. Asked question about API limits.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        user: 'System',
        icon: User,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
    }
]

export function ActivityTimeline({ lead }: ActivityTimelineProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semisemibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4 space-y-8 pb-4">
                    {activities.map((activity, index) => {
                        const Icon = activity.icon
                        return (
                            <div key={activity.id} className="relative pl-6">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[13px] top-1 rounded-full p-1.5 border border-white dark:border-zinc-900 ${activity.color}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-1">
                                    <h4 className="text-sm font-semisemibold text-zinc-900 dark:text-white">
                                        {activity.title}
                                    </h4>
                                    <span className="text-xs text-zinc-400 whitespace-nowrap">
                                        {format(activity.date, 'MMM d, h:mm a')}
                                    </span>
                                </div>

                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                    {activity.description}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span className="font-medium">{activity.user}</span>
                                    <span>•</span>
                                    <span className="capitalize">{activity.type.replace('_', ' ')}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
