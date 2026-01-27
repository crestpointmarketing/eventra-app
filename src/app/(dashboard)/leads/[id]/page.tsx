'use client'

import { use } from 'react'
import { useLead } from '@/hooks/useLead'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: lead, isLoading, error } = useLead(id)

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-zinc-600 dark:text-white/70">Loading lead...</p>
            </div>
        )
    }

    if (error || !lead) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Lead not found</p>
                <Link href="/leads">
                    <Button className="mt-4">Back to Leads</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <Link href="/leads" className="text-zinc-600 hover:text-zinc-900 dark:text-white/60 dark:hover:text-[#cbfb45] text-sm mb-4 inline-block">
                ← Back to Leads
            </Link>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-5xl font-medium text-zinc-900 dark:text-white mb-4">
                        {lead.first_name} {lead.last_name}
                    </h1>
                    <p className="text-zinc-600 dark:text-white/70 text-lg">{lead.company || 'No company'}</p>
                </div>
                <Badge variant={lead.lead_score >= 80 ? 'lime' : 'secondary'} className="text-lg px-4 py-2">
                    Score: {lead.lead_score || 0}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact Information */}
                <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 lg:col-span-2">
                    <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-6">Contact Information</h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Email</p>
                            <p className="text-zinc-900 dark:text-white/85">{lead.email}</p>
                        </div>
                        <div>
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Phone</p>
                            <p className="text-zinc-900 dark:text-white/85">{lead.phone || 'Not provided'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Company</p>
                            <p className="text-zinc-900 dark:text-white/85">{lead.company || 'Not provided'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Job Title</p>
                            <p className="text-zinc-900 dark:text-white/85">{lead.job_title || 'Not provided'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Event</p>
                            <p className="text-zinc-900 dark:text-white/85">{lead.events?.name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-zinc-600 dark:text-white/60 text-sm mb-1">Status</p>
                            <Badge variant="outline">{lead.lead_status || 'new'}</Badge>
                        </div>
                    </div>
                </Card>

                {/* Lead Score */}
                <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 text-center">
                    <p className="text-zinc-600 dark:text-white/60 text-sm mb-2">Lead Score</p>
                    <p className="text-6xl font-medium text-lime-400 mb-4">{lead.lead_score || 0}</p>
                    <Badge variant={lead.lead_score >= 80 ? 'lime' : lead.lead_score >= 50 ? 'secondary' : 'outline'}>
                        {lead.lead_score >= 80 ? 'Hot' : lead.lead_score >= 50 ? 'Warm' : 'Cold'}
                    </Badge>
                </Card>
            </div>

            {/* AI Summary */}
            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 mt-6">
                <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-4">🤖 AI Summary</h2>
                <p className="text-zinc-600 dark:text-white/70">
                    AI-powered lead insights and recommendations will appear here in future updates.
                </p>
            </Card>

            {/* Follow-up History */}
            <Card className="p-8 border border-zinc-200 dark:bg-slate-900 dark:border-white/10 mt-6">
                <h2 className="text-2xl font-medium text-zinc-900 dark:text-white mb-4">Follow-up History</h2>
                <p className="text-zinc-600 dark:text-white/70">No follow-up activities yet</p>
            </Card>
        </div>
    )
}
